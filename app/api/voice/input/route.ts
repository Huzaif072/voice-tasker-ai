import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getVoiceSessionsCollection } from "@/lib/db/models/VoiceSession";
import { voiceInputSchema } from "@/lib/validators/voice";
import { parseIntent, basicRegexIntent } from "@/lib/groq/intent-parser";
import { transcribeAudio } from "@/lib/groq/whisper";
import { transcribeLocal } from "@/lib/whisper-cpp/transcribe";
import { rateLimit, invalidateCache } from "@/lib/redis/ratelimit";
import { findTasksByTitle } from "@/lib/tasks/find-by-title";
import { sendDelegationEmail } from "@/lib/notifications/email";
import { createVoiceConfirmation, verifyVoiceConfirmation } from "@/lib/voice/confirmation";
import type { Task } from "@/types/task";
import { normalizeTask } from "@/lib/tasks/normalize";
import type { ParsedIntent } from "@/types/voice";

type VoiceIntent = ParsedIntent & { confidence: number };

const destructiveActions = new Set(["update", "delete", "delegate"]);

function actionMessage(action: string, taskTitle?: string, success = true): string {
  if (!success) return taskTitle ? `Could not find a task matching "${taskTitle}".` : "Action could not be completed.";
  if (action === "create") return taskTitle ? `Task "${taskTitle}" created successfully.` : "Task created successfully.";
  if (action === "update") return taskTitle ? `Task "${taskTitle}" marked as completed.` : "Task marked as completed.";
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
  else if (query.includes("pending") || query.includes("active")) filter.status = "pending";
  if (query.includes("overdue")) filter.dueDate = { $lt: now.toISOString() };
  else if (query.includes("today")) {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    filter.dueDate = { $gte: start.toISOString(), $lt: end.toISOString() };
  }
  return filter;
}

function serializeTask(task: Partial<Task>) {
  return normalizeTask({ ...task, _id: task._id?.toString() });
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
      try { transcript = await transcribeAudio(buffer, parsed.data.mimeType ?? "audio/webm"); }
      catch { try { transcript = await transcribeLocal(buffer); } catch { return NextResponse.json({ error: "Transcription failed" }, { status: 502 }); } }
    }
    if (!transcript.trim()) return NextResponse.json({ error: "No speech detected" }, { status: 400 });

    let intent: VoiceIntent;
    try { intent = await parseIntent(transcript); } catch { intent = basicRegexIntent(transcript); }
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const sessions = await getVoiceSessionsCollection(db);
    const userId = auth.user.id;
    const now = new Date().toISOString();
    const candidates = intent.taskTitle ? await findTasksByTitle(tasks, auth.user.id, intent.taskTitle) : [];
    const candidateSummary = candidates.map((candidate) => ({ id: candidate._id!.toString(), title: candidate.title }));

    async function logSession(taskId?: string) {
      await sessions.insertOne({ userId, inputText: transcript, parsedIntent: intent, taskId, model: "llama-3.3-70b-versatile", confidence: intent.confidence, timestamp: now });
    }

    if (intent.action === "unknown") {
      await logSession();
      return NextResponse.json({ transcript, intent, message: "I’m not sure what you want to do. Try creating, completing, deleting, delegating, or asking about a task.", success: false });
    }
    if (destructiveActions.has(intent.action) && !parsed.data.confirm) {
      if ((intent.action === "update" || intent.action === "delete") && !intent.taskTitle) {
        await logSession();
        return NextResponse.json({ transcript, intent, message: `Which task should I ${intent.action === "delete" ? "delete" : "complete"}? Please include its title.`, success: false });
      }
      if (intent.action === "delegate" && (!intent.taskTitle || !intent.assignee)) {
        await logSession();
        return NextResponse.json({ transcript, intent, message: "To delegate a task, please include both the task title and the assignee’s email address.", success: false });
      }
      if (candidates.length > 1) {
        const nextIntent = { ...intent, ambiguousTasks: candidateSummary };
        await sessions.insertOne({ userId: auth.user.id, inputText: transcript, parsedIntent: nextIntent, model: "llama-3.3-70b-versatile", confidence: intent.confidence, timestamp: now });
        return NextResponse.json({ transcript, intent: nextIntent, ambiguousTasks: candidateSummary, message: `I found ${candidates.length} matching tasks. Please choose one or say the full task title.`, success: false });
      }
      if (!candidates.length) {
        await logSession();
        return NextResponse.json({ transcript, intent, message: actionMessage(intent.action, intent.taskTitle, false), success: false });
      }
      const token = createVoiceConfirmation(auth.user.id, intent.action, candidates[0]._id!.toString());
      const nextIntent = { ...intent, requiresConfirmation: true };
      await sessions.insertOne({ userId: auth.user.id, inputText: transcript, parsedIntent: nextIntent, taskId: candidates[0]._id!.toString(), model: "llama-3.3-70b-versatile", confidence: intent.confidence, timestamp: now });
      const verb = intent.action === "delete" ? "delete" : intent.action === "delegate" ? "delegate" : "complete";
      return NextResponse.json({ transcript, intent: nextIntent, requiresConfirmation: true, confirmationToken: token, message: `Please confirm: ${verb} “${candidates[0].title}”.`, success: false });
    }

    let taskId: string | undefined;
    let task: Task | undefined;
    let message = actionMessage(intent.action, intent.taskTitle);
    let success = true;

    if (destructiveActions.has(intent.action)) {
      const existing = candidates[0];
      if (!existing || !parsed.data.confirm || !parsed.data.confirmationToken || !verifyVoiceConfirmation(parsed.data.confirmationToken, auth.user.id, intent.action, existing._id!.toString())) {
        await logSession();
        return NextResponse.json({ transcript, intent, message: "This confirmation is invalid or expired. Please repeat the command to request a new confirmation.", success: false }, { status: 409 });
      }
    }

    if (intent.action === "create" && intent.taskTitle) {
      const taskDoc = { title: intent.taskTitle, status: "pending" as const, priority: intent.priority ?? ("medium" as const), dueDate: intent.dueDate, subtasks: [], contextTriggers: [], delegatedTo: intent.assignee, createdBy: auth.user.id, tags: ["voice"], createdAt: now, updatedAt: now };
      const result = await tasks.insertOne(taskDoc); taskId = result.insertedId.toString(); task = { ...taskDoc, _id: taskId }; await invalidateCache(`tasks:${auth.user.id}:*`);
    } else if ((intent.action === "update" || intent.action === "delete") && intent.taskTitle) {
      const existing = candidates[0];
      if (!existing) { success = false; message = actionMessage(intent.action, intent.taskTitle, false); }
      else if (intent.action === "update") {
        const updated = await tasks.findOneAndUpdate({ _id: existing._id, createdBy: auth.user.id }, { $set: { status: "completed", updatedAt: now } }, { returnDocument: "after" });
        taskId = existing._id!.toString(); task = updated ? { ...updated, _id: taskId } : undefined; message = actionMessage("update", existing.title); await invalidateCache(`tasks:${auth.user.id}:*`);
      } else { await tasks.deleteOne({ _id: existing._id, createdBy: auth.user.id }); taskId = existing._id!.toString(); message = actionMessage("delete", existing.title); await invalidateCache(`tasks:${auth.user.id}:*`); }
    } else if (intent.action === "delegate" && intent.taskTitle && intent.assignee) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(intent.assignee)) { success = false; message = "Please provide a valid assignee email address."; }
      else {
        const existing = candidates[0];
        if (!existing) { success = false; message = actionMessage("delegate", intent.taskTitle, false); }
        else { await tasks.updateOne({ _id: existing._id, createdBy: auth.user.id }, { $set: { delegatedTo: intent.assignee.toLowerCase(), updatedAt: now } }); const sent = await sendDelegationEmail(intent.assignee.toLowerCase(), existing.title, auth.user.name); taskId = existing._id!.toString(); message = sent ? actionMessage("delegate", existing.title) : `Task “${existing.title}” saved as pending delegation.`; await invalidateCache(`tasks:${auth.user.id}:*`); }
      }
    } else if (intent.action === "query") {
      const results = await tasks.find({ createdBy: auth.user.id, ...queryFilter(intent.rawQuery) }).sort({ dueDate: 1, priority: -1, createdAt: -1 }).limit(10).toArray();
      const serialized = results.map((row) => serializeTask({ ...row, _id: row._id?.toString() } as Task));
      message = serialized.length ? `I found ${serialized.length} matching task${serialized.length === 1 ? "" : "s"}.` : "I couldn’t find any tasks matching that query.";
      await logSession();
      return NextResponse.json({ transcript, intent, tasks: serialized, message, success: true });
    } else if (intent.action === "delegate" || intent.action === "update" || intent.action === "delete") {
      success = false; message = "I need more details to complete that command.";
    }

    await logSession(taskId);
    return NextResponse.json({ transcript, intent, taskId, task: task ? serializeTask(task) : undefined, message, success });
  } catch (err) {
    console.error("Voice input error:", err);
    return NextResponse.json({ error: "Voice processing failed" }, { status: 500 });
  }
}
