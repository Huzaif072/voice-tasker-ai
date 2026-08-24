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
import type { Task } from "@/types/task";

const destructiveActions = new Set(["update", "delete", "delegate"]);

function actionMessage(action: string, taskTitle?: string, success = true): string {
  if (!success) return taskTitle ? `Could not find a task matching "${taskTitle}".` : "Action could not be completed.";
  switch (action) {
    case "create": return taskTitle ? `Task "${taskTitle}" created successfully.` : "Task created successfully.";
    case "update": return taskTitle ? `Task "${taskTitle}" marked as completed.` : "Task marked as completed.";
    case "delete": return taskTitle ? `Task "${taskTitle}" deleted.` : "Task deleted.";
    case "delegate": return taskTitle ? `Task "${taskTitle}" delegated successfully.` : "Task delegated successfully.";
    case "query": return "Here are your matching tasks.";
    default: return "Voice command processed.";
  }
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
      const mimeType = parsed.data.mimeType ?? "audio/webm";
      try { transcript = await transcribeAudio(buffer, mimeType); }
      catch { try { transcript = await transcribeLocal(buffer); } catch { return NextResponse.json({ error: "Transcription failed" }, { status: 502 }); } }
    }
    if (!transcript.trim()) return NextResponse.json({ error: "No speech detected" }, { status: 400 });

    let intent;
    try { intent = await parseIntent(transcript); } catch { intent = basicRegexIntent(transcript); }
    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const now = new Date().toISOString();
    const candidates = intent.taskTitle ? await findTasksByTitle(tasks, auth.user.id, intent.taskTitle) : [];

    if (intent.action === "unknown") {
      return NextResponse.json({ transcript, intent, message: "I’m not sure what you want to do. Try creating, completing, deleting, delegating, or asking about a task.", success: false });
    }
    if (destructiveActions.has(intent.action) && !parsed.data.confirm) {
      if ((intent.action === "update" || intent.action === "delete") && !intent.taskTitle) {
        return NextResponse.json({ transcript, intent, message: `Which task should I ${intent.action === "delete" ? "delete" : "complete"}? Please include its title.`, success: false });
      }
      if (intent.action === "delegate" && (!intent.taskTitle || !intent.assignee)) {
        return NextResponse.json({ transcript, intent, message: "To delegate a task, please include both the task title and the assignee’s email address.", success: false });
      }
      if (candidates.length > 1) {
        return NextResponse.json({ transcript, intent: { ...intent, ambiguousTasks: candidates.map((candidate) => ({ id: candidate._id!.toString(), title: candidate.title })) }, ambiguousTasks: candidates.map((candidate) => ({ id: candidate._id!.toString(), title: candidate.title })), message: `I found ${candidates.length} matching tasks. Please be more specific: ${candidates.map((candidate) => candidate.title).join(", ")}.`, success: false });
      }
      if (!candidates.length) {
        return NextResponse.json({ transcript, intent, message: actionMessage(intent.action, intent.taskTitle, false), success: false });
      }
      const actionVerb = intent.action === "delete" ? "delete" : intent.action === "delegate" ? "delegate" : "complete";
      return NextResponse.json({ transcript, intent: { ...intent, requiresConfirmation: true }, requiresConfirmation: true, message: candidates[0] ? `Please confirm: ${actionVerb} “${candidates[0].title}”. Send the command again to confirm.` : `I couldn’t find a matching task to ${actionVerb}.`, success: false });
    }

    let taskId: string | undefined;
    let task: Task | undefined;
    let message = actionMessage(intent.action, intent.taskTitle);
    let success = true;
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
      const existing = candidates[0];
      if (!existing) { success = false; message = actionMessage("delegate", intent.taskTitle, false); }
      else {
        await tasks.updateOne({ _id: existing._id, createdBy: auth.user.id }, { $set: { delegatedTo: intent.assignee, updatedAt: now } });
        const sent = await sendDelegationEmail(intent.assignee, existing.title, auth.user.name);
        taskId = existing._id!.toString(); message = sent ? actionMessage("delegate", existing.title) : `Task “${existing.title}” saved as pending delegation.`; await invalidateCache(`tasks:${auth.user.id}:*`);
      }
    } else if (intent.action === "delegate") {
      success = false;
      message = "To delegate a task, please include both the task title and the assignee’s email address.";
    } else if (intent.action === "update" || intent.action === "delete") {
      success = false;
      message = `To ${intent.action === "delete" ? "delete" : "complete"} a task, please include its title.`;
    } else if (intent.action === "query") {
      const results = await tasks.find({ createdBy: auth.user.id, ...queryFilter(intent.rawQuery) }).sort({ dueDate: 1, priority: -1, createdAt: -1 }).limit(10).toArray();
      message = results.length ? `I found ${results.length} matching task${results.length === 1 ? "" : "s"}.` : "I couldn’t find any tasks matching that query.";
    }

    const sessions = await getVoiceSessionsCollection(db);
    await sessions.insertOne({ userId: auth.user.id, inputText: transcript, parsedIntent: intent, taskId, model: "llama-3.3-70b-versatile", confidence: intent.confidence, timestamp: now });
    return NextResponse.json({ transcript, intent, taskId, task: task ? { ...task, _id: task._id?.toString() } : undefined, message, success });
  } catch (err) {
    console.error("Voice input error:", err);
    return NextResponse.json({ error: "Voice processing failed" }, { status: 500 });
  }
}
