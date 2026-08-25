import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getVoiceSessionsCollection } from "@/lib/db/models/VoiceSession";
import { getUsersCollection } from "@/lib/db/models/User";
import { voiceInputSchema } from "@/lib/validators/voice";
import { parseIntent, basicRegexIntent } from "@/lib/groq/intent-parser";
import { transcribeAudio } from "@/lib/groq/whisper";
import { transcribeLocal } from "@/lib/whisper-cpp/transcribe";
import { rateLimit, invalidateCache } from "@/lib/redis/ratelimit";
import { findTasksByTitle } from "@/lib/tasks/find-by-title";
import { sendDelegationEmail } from "@/lib/notifications/email";
import { sendSms } from "@/lib/notifications/sms";
import { createVoiceConfirmation, verifyVoiceConfirmation } from "@/lib/voice/confirmation";
import { buildCalendarComposeLink } from "@/lib/calendar/link";
import { cancelTaskDeliveries } from "@/lib/reminders/cancelTaskDeliveries";
import type { Task } from "@/types/task";
import { normalizeTask } from "@/lib/tasks/normalize";
import type { ParsedIntent, VoiceConversationState } from "@/types/voice";
import { withTimeout } from "@/lib/utils/withTimeout";
import { trackEvent } from "@/lib/analytics/events";
import { captureException } from "@/lib/monitoring/capture";
import { validateTaskDependencies } from "@/lib/tasks/dependencies";

type VoiceIntent = ParsedIntent & { confidence: number };
const destructiveActions = new Set(["update", "delete", "delegate"]);
const VOICE_PROVIDER_TIMEOUT_MS = 15_000;

function actionMessage(action: string, taskTitle?: string, success = true): string {
  if (!success) return taskTitle ? `Could not find a task matching "${taskTitle}".` : "Action could not be completed.";
  if (action === "create") return taskTitle ? `Task "${taskTitle}" created successfully.` : "Task created successfully.";
  if (action === "update") return taskTitle ? `Task "${taskTitle}" updated successfully.` : "Task updated successfully.";
  if (action === "delete") return taskTitle ? `Task "${taskTitle}" deleted.` : "Task deleted.";
  if (action === "delegate") return taskTitle ? `Task "${taskTitle}" delegated successfully.` : "Task delegated successfully.";
  if (action === "query") return "Here are your matching tasks.";
  return "Voice command processed.";
}

function queryFilter(rawQuery: string, now = new Date()) {
  const query = rawQuery.toLowerCase();
  const filter: Record<string, unknown> = { status: { $ne: "cancelled" } };
  if (query.includes("urgent")) filter.priority = "urgent";
  else if (query.includes("high priority") || query.includes("high-priority")) filter.priority = "high";
  if (query.includes("completed")) filter.status = "completed";
  else if (query.includes("pending") || query.includes("active")) filter.status = { $in: ["pending", "in_progress"] };
  if (query.includes("overdue")) filter.dueDate = { $lt: now.toISOString() };
  else if (query.includes("this afternoon")) {
    const start = new Date(now); start.setHours(12, 0, 0, 0);
    const end = new Date(start); end.setHours(18, 0, 0, 0);
    filter.dueDate = { $gte: start.toISOString(), $lt: end.toISOString() };
  } else if (query.includes("today")) {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    filter.dueDate = { $gte: start.toISOString(), $lt: end.toISOString() };
  }
  return filter;
}

function serializeTask(task: Partial<Task>) {
  return normalizeTask({ ...task, _id: task._id?.toString() });
}

function isAffirmation(text: string) {
  return /^(yes|yeah|yep|confirm|confirmed|do it|go ahead|please do|okay|ok)\b/i.test(text.trim());
}

function resolveConversationIntent(text: string, intent: VoiceIntent, context?: VoiceConversationState): VoiceIntent {
  const modelReturnedPronoun = Boolean(intent.taskTitle && /^(it|this task|that task)$/i.test(intent.taskTitle.trim()));
  if (!context?.lastTaskTitle || (intent.taskTitle && !modelReturnedPronoun) || !/\b(it|this task|that task)\b/i.test(text)) return intent;
  const action = intent.action === "create" && /\b(remind|change|make|update|reschedule)\b/i.test(text) ? "update" : intent.action;
  return { ...intent, action, taskTitle: context.lastTaskTitle };
}

function resolveQueryReference(text: string, context?: VoiceConversationState) {
  const previous = context?.lastQueryTasks ?? [];
  if (!previous.length) return undefined;
  const match = text.toLowerCase().match(/\b(first|1st|second|2nd|third|3rd|last)\b/);
  if (!match) return undefined;
  const index = match[1] === "last" ? previous.length - 1 : ({ first: 0, "1st": 0, second: 1, "2nd": 1, third: 2, "3rd": 2 }[match[1]] ?? -1);
  const target = previous[index];
  if (!target?._id) return undefined;
  const action = /\b(delete|remove)\b/i.test(text) ? "delete" : "update";
  return { action, taskTitle: target.title, rawQuery: text, confidence: 1 } as VoiceIntent;
}

function followUpPrompts(intent: VoiceIntent, task?: Task) {
  if (intent.action === "query") return ["Complete the first one", "Show me the second one", "Filter these by priority"];
  if (intent.action === "create") return ["Set a reminder for this task", "Make it urgent", "Break it into subtasks"];
  if (task?.status === "completed") return ["What else is due today?", "Show my urgent tasks"];
  return ["Complete it", "Change its priority", "Set a reminder for it"];
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const limited = await rateLimit(`voice:${auth.user.id}`, 20, 60);
  if (!limited.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const body = await request.json();
    const parsed = voiceInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid voice input" }, { status: 400 });
    let transcript = parsed.data.text ?? "";
    if (!transcript && parsed.data.audio) {
      const buffer = Buffer.from(parsed.data.audio, "base64");
      try { transcript = await withTimeout(transcribeAudio(buffer, parsed.data.mimeType ?? "audio/webm"), VOICE_PROVIDER_TIMEOUT_MS, "Remote transcription timed out"); }
      catch { try { transcript = await withTimeout(transcribeLocal(buffer), VOICE_PROVIDER_TIMEOUT_MS, "Local transcription timed out"); } catch { return NextResponse.json({ error: "Transcription failed" }, { status: 502 }); } }
    }
    if (!transcript.trim()) return NextResponse.json({ error: "No speech detected" }, { status: 400 });

    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const sessions = await getVoiceSessionsCollection(db);
    const userId = auth.user.id;
    const conversationId = parsed.data.conversationId ?? randomUUID();
    const previousSession = parsed.data.conversationId
      ? await sessions.find({ userId, conversationId }).sort({ timestamp: -1 }).limit(1).next()
      : null;
    const previousContext: VoiceConversationState = previousSession?.conversationContext
      ? { conversationId, ...previousSession.conversationContext }
      : { conversationId, updatedAt: new Date().toISOString() };

    let intent: VoiceIntent;
    try { intent = await withTimeout(parseIntent(transcript), VOICE_PROVIDER_TIMEOUT_MS, "Intent parsing timed out"); }
    catch { intent = basicRegexIntent(transcript); }
    intent = resolveConversationIntent(transcript, intent, previousContext);
    const referenceIntent = resolveQueryReference(transcript, previousContext);
    if (referenceIntent) intent = referenceIntent;
    const affirmation = !parsed.data.confirm && isAffirmation(transcript) && previousContext.pendingIntent && previousContext.pendingConfirmationToken;
    if (affirmation) intent = { ...previousContext.pendingIntent!, requiresConfirmation: false, confidence: 1, rawQuery: transcript };

    const now = new Date().toISOString();
    const candidates = intent.taskTitle ? await findTasksByTitle(tasks, auth.user.id, intent.taskTitle) : [];
    const candidateSummary = candidates.map((candidate) => ({ id: candidate._id!.toString(), title: candidate.title }));
    let conversationContext: VoiceConversationState = { ...previousContext, updatedAt: now };

    async function logSession(taskId?: string, nextIntent: VoiceIntent = intent) {
      await sessions.insertOne({ userId, conversationId, conversationContext: { pendingIntent: conversationContext.pendingIntent, pendingConfirmationToken: conversationContext.pendingConfirmationToken, lastQueryTasks: conversationContext.lastQueryTasks, lastTaskId: conversationContext.lastTaskId, lastTaskTitle: conversationContext.lastTaskTitle, updatedAt: conversationContext.updatedAt },
 inputText: transcript, parsedIntent: nextIntent, taskId, model: "llama-3.3-70b-versatile", confidence: nextIntent.confidence, timestamp: now });
      await trackEvent(db, userId, "voice_session", { action: nextIntent.action, confidence: nextIntent.confidence });
    }

    if (intent.action === "unknown") {
      await logSession();
      return NextResponse.json({ transcript, intent, conversationId, followUpPrompts: ["Create a task", "Show my tasks", "What is due today?"], message: "I’m not sure what you want to do. Try creating, completing, updating, deleting, delegating, or asking about a task.", success: false });
    }
    if (destructiveActions.has(intent.action) && !parsed.data.confirm && !affirmation) {
      if ((intent.action === "update" || intent.action === "delete") && !intent.taskTitle) {
        await logSession();
        return NextResponse.json({ transcript, intent, conversationId, followUpPrompts: ["Include the task title", "Ask what is due today"], message: `Which task should I ${intent.action === "delete" ? "delete" : "update"}? Please include its title.`, success: false });
      }
      if (intent.action === "delegate" && (!intent.taskTitle || (!intent.assignee && !intent.assigneePhone))) {
        await logSession();
        return NextResponse.json({ transcript, intent, conversationId, followUpPrompts: ["Include an email address", "Include an E.164 phone number"], message: "To delegate a task, please include the task title and an assignee email or phone number.", success: false });
      }
      if (candidates.length > 1) {
        const nextIntent = { ...intent, ambiguousTasks: candidateSummary };
        await logSession(undefined, nextIntent);
        return NextResponse.json({ transcript, intent: nextIntent, conversationId, ambiguousTasks: candidateSummary, followUpPrompts: candidateSummary.slice(0, 3).map((candidate) => `Choose ${candidate.title}`), message: `I found ${candidates.length} matching tasks. Please choose one or say the full task title.`, success: false });
      }
      if (!candidates.length) {
        await logSession();
        return NextResponse.json({ transcript, intent, conversationId, followUpPrompts: ["Show my tasks", "Create a new task"], message: actionMessage(intent.action, intent.taskTitle, false), success: false });
      }
      const token = createVoiceConfirmation(auth.user.id, intent.action, candidates[0]._id!.toString());
      conversationContext = { ...conversationContext, pendingIntent: intent, pendingConfirmationToken: token };
      await logSession(candidates[0]._id!.toString(), { ...intent, requiresConfirmation: true });
      const verb = intent.action === "delete" ? "delete" : intent.action === "delegate" ? "delegate" : "update";
      return NextResponse.json({ transcript, intent: { ...intent, requiresConfirmation: true }, conversationId, requiresConfirmation: true, confirmationToken: token, followUpPrompts: ["Yes, confirm", "No, cancel"], message: `Please confirm: ${verb} “${candidates[0].title}”.`, success: false });
    }

    let taskId: string | undefined;
    let task: Task | undefined;
    let message = actionMessage(intent.action, intent.taskTitle);
    let success = true;
    if (destructiveActions.has(intent.action)) {
      const existing = candidates[0];
      const token = parsed.data.confirmationToken ?? conversationContext.pendingConfirmationToken;
      if (!existing || (!parsed.data.confirm && !affirmation) || !token || !verifyVoiceConfirmation(token, auth.user.id, intent.action, existing._id!.toString())) {
        await logSession();
        return NextResponse.json({ transcript, intent, conversationId, followUpPrompts: ["Repeat the command to request confirmation"], message: "This confirmation is invalid or expired. Please repeat the command to request a new confirmation.", success: false }, { status: 409 });
      }
    }

    if (intent.action === "create" && intent.taskTitle) {
      const dependencyError = await validateTaskDependencies(tasks, auth.user.id, undefined, intent.dependencies ?? []);
      if (dependencyError) return NextResponse.json({ error: dependencyError }, { status: 400 });
      const calendarLink = intent.calendarLink ?? buildCalendarComposeLink(intent.taskTitle, intent.dueDate ?? intent.reminderAt, intent.durationMinutes);
      const taskDoc = { title: intent.taskTitle, description: intent.description, status: "pending" as const, priority: intent.priority ?? "medium", dueDate: intent.dueDate, reminderAt: intent.reminderAt, durationMinutes: intent.durationMinutes, calendarQuery: intent.calendarQuery, calendarLink, subtasks: intent.subtasks ?? [], dependencies: intent.dependencies ?? [], contextTriggers: intent.contextTriggers ?? [], delegatedTo: intent.assignee, delegatedPhone: intent.assigneePhone, delegationStatus: intent.assignee || intent.assigneePhone ? ("pending" as const) : ("none" as const), createdBy: auth.user.id, tags: ["voice"], createdAt: now, updatedAt: now };
      const result = await tasks.insertOne(taskDoc);
      taskId = result.insertedId.toString(); task = { ...taskDoc, _id: taskId } as Task;
      conversationContext = { ...conversationContext, lastTaskId: taskId, lastTaskTitle: task.title };
      await invalidateCache(`tasks:${auth.user.id}:*`);
      await invalidateCache(`ai-summary:${auth.user.id}:*`);
      if (calendarLink) message += " A calendar link is included.";
    } else if ((intent.action === "update" || intent.action === "delete") && intent.taskTitle) {
      const existing = candidates[0];
      if (!existing) { success = false; message = actionMessage(intent.action, intent.taskTitle, false); }
      else if (intent.action === "update") {
        const fieldUpdates: Record<string, unknown> = {};
        if (intent.priority) fieldUpdates.priority = intent.priority;
        if (intent.dueDate) fieldUpdates.dueDate = intent.dueDate;
        if (intent.reminderAt) fieldUpdates.reminderAt = intent.reminderAt;
        if (intent.durationMinutes) fieldUpdates.durationMinutes = intent.durationMinutes;
        if (intent.calendarQuery) fieldUpdates.calendarQuery = intent.calendarQuery;
        if (intent.description) fieldUpdates.description = intent.description;
        if (intent.contextTriggers) fieldUpdates.contextTriggers = intent.contextTriggers;
        if (intent.subtasks) fieldUpdates.subtasks = intent.subtasks;
        if (intent.dependencies) {
          const dependencyError = await validateTaskDependencies(tasks, auth.user.id, existing._id!.toString(), intent.dependencies);
          if (dependencyError) return NextResponse.json({ error: dependencyError }, { status: 400 });
          fieldUpdates.dependencies = intent.dependencies;
        }
        if (intent.dueDate || intent.reminderAt) fieldUpdates.calendarLink = buildCalendarComposeLink(existing.title, intent.dueDate ?? intent.reminderAt, intent.durationMinutes ?? existing.durationMinutes);
        if (!Object.keys(fieldUpdates).length) fieldUpdates.status = "completed";
        const updated = await tasks.findOneAndUpdate({ _id: existing._id, createdBy: auth.user.id }, { $set: { ...fieldUpdates, updatedAt: now } }, { returnDocument: "after" });
        taskId = existing._id!.toString(); task = updated ? { ...updated, _id: taskId } as Task : undefined; conversationContext = { ...conversationContext, lastTaskId: taskId, lastTaskTitle: existing.title }; message = actionMessage("update", existing.title); await invalidateCache(`tasks:${auth.user.id}:*`); await invalidateCache(`ai-summary:${auth.user.id}:*`);
        if (fieldUpdates.status === "completed") {
          await trackEvent(db, userId, "task_completed");
          const users = await getUsersCollection(db);
          await users.updateOne({ _id: new ObjectId(userId) }, { $inc: { "behaviorProfile.completedTaskCount": 1, "behaviorProfile.highPriorityCompletedCount": existing.priority === "high" || existing.priority === "urgent" ? 1 : 0 }, $set: { "behaviorProfile.updatedAt": new Date().toISOString() } });
        }
      } else {
        await tasks.deleteOne({ _id: existing._id, createdBy: auth.user.id });
        await cancelTaskDeliveries(db, existing._id!.toString(), auth.user.id);
        taskId = existing._id!.toString(); conversationContext = { ...conversationContext, lastTaskId: taskId, lastTaskTitle: existing.title }; message = actionMessage("delete", existing.title); await invalidateCache(`tasks:${auth.user.id}:*`); await invalidateCache(`ai-summary:${auth.user.id}:*`);
        await trackEvent(db, userId, "task_deleted");
      }
    } else if (intent.action === "delegate" && intent.taskTitle && (intent.assignee || intent.assigneePhone)) {
      const existing = candidates[0];
      if (!existing) { success = false; message = actionMessage("delegate", intent.taskTitle, false); }
      else {
        const validEmail = intent.assignee ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(intent.assignee) : false;
        const validPhone = intent.assigneePhone ? /^\+[1-9]\d{7,14}$/.test(intent.assigneePhone) : false;
        if (intent.assignee && !validEmail || intent.assigneePhone && !validPhone) { success = false; message = "Please provide a valid assignee email or international E.164 phone number."; }
        else {
          await tasks.updateOne({ _id: existing._id, createdBy: auth.user.id }, { $set: { ...(intent.assignee ? { delegatedTo: intent.assignee.toLowerCase() } : {}), ...(intent.assigneePhone ? { delegatedPhone: intent.assigneePhone } : {}), delegationStatus: "pending", updatedAt: now } });
          const emailSent = intent.assignee ? await sendDelegationEmail(intent.assignee.toLowerCase(), existing.title, auth.user.name) : false;
          const smsResult = intent.assigneePhone ? await sendSms(intent.assigneePhone, `${auth.user.name} delegated a task to you: ${existing.title}`) : { sent: false, configured: false, permanent: false };
          const delivered = emailSent || smsResult.sent;
          await tasks.updateOne({ _id: existing._id, createdBy: auth.user.id }, { $set: { delegationStatus: delivered ? "sent" : "failed", updatedAt: new Date().toISOString() } });
          await trackEvent(db, userId, "delegation_sent", { email: emailSent, sms: smsResult.sent });
          taskId = existing._id!.toString(); conversationContext = { ...conversationContext, lastTaskId: taskId, lastTaskTitle: existing.title }; message = delivered ? actionMessage("delegate", existing.title) : `Task “${existing.title}” saved as a failed delegation.`;
          await invalidateCache(`tasks:${auth.user.id}:*`);
        }
      }
    } else if (intent.action === "query") {
      const results = await tasks.find({ createdBy: auth.user.id, ...queryFilter(intent.rawQuery) }).sort({ dueDate: 1, priority: -1, createdAt: -1 }).limit(10).toArray();
      const serialized = results.map((row) => serializeTask({ ...row, _id: row._id?.toString() } as Task));
      conversationContext = { ...conversationContext, lastQueryTasks: serialized.map((item) => ({ _id: item._id, title: item.title, status: item.status, priority: item.priority })), pendingIntent: undefined, pendingConfirmationToken: undefined };
      message = serialized.length ? `I found ${serialized.length} matching task${serialized.length === 1 ? "" : "s"}.` : "I couldn’t find any tasks matching that query.";
      await logSession();
      return NextResponse.json({ transcript, intent, conversationId, tasks: serialized, followUpPrompts: followUpPrompts(intent), message, success: true });
    } else if (intent.action === "delegate" || intent.action === "update" || intent.action === "delete") {
      success = false; message = "I need more details to complete that command.";
    }

    conversationContext = { ...conversationContext, pendingIntent: undefined, pendingConfirmationToken: undefined };
    await logSession(taskId);
    return NextResponse.json({ transcript, intent, conversationId, taskId, task: task ? serializeTask(task) : undefined, calendarLink: task?.calendarLink, followUpPrompts: followUpPrompts(intent, task), message, success });
  } catch (err) {
    captureException(err, { route: "/api/voice/input" });
    console.error("Voice input error:", err);
    return NextResponse.json({ error: "Voice processing failed" }, { status: 500 });
  }
}
