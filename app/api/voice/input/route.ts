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
import { findTaskByTitle } from "@/lib/tasks/find-by-title";
import type { Task } from "@/types/task";

function actionMessage(
  action: string,
  taskTitle?: string,
  success = true
): string {
  if (!success) {
    return taskTitle
      ? `Could not find a task matching "${taskTitle}".`
      : "Action could not be completed.";
  }

  switch (action) {
    case "create":
      return taskTitle ? `Task "${taskTitle}" created successfully.` : "Task created successfully.";
    case "update":
      return taskTitle ? `Task "${taskTitle}" marked as completed.` : "Task marked as completed.";
    case "delete":
      return taskTitle ? `Task "${taskTitle}" deleted.` : "Task deleted.";
    case "query":
      return "Here are your matching tasks.";
    default:
      return "Voice command processed.";
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const limited = await rateLimit(`voice:${auth.user.id}`, 20, 60);
  if (!limited.success) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = voiceInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid voice input" }, { status: 400 });
    }

    let transcript = parsed.data.text ?? "";

    if (!transcript && parsed.data.audio) {
      const buffer = Buffer.from(parsed.data.audio, "base64");
      const mimeType = parsed.data.mimeType ?? "audio/webm";

      try {
        transcript = await transcribeAudio(buffer, mimeType);
      } catch {
        try {
          transcript = await transcribeLocal(buffer);
        } catch {
          return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
        }
      }
    }

    if (!transcript.trim()) {
      return NextResponse.json({ error: "No speech detected" }, { status: 400 });
    }

    let intent;
    try {
      intent = await parseIntent(transcript);
    } catch {
      intent = basicRegexIntent(transcript);
    }

    const db = await connectWithRetry();
    const tasks = await getTasksCollection(db);
    const now = new Date().toISOString();

    let taskId: string | undefined;
    let task: Task | undefined;
    let message = actionMessage(intent.action, intent.taskTitle);
    let success = true;

    if (intent.action === "create" && intent.taskTitle) {
      const taskDoc = {
        title: intent.taskTitle,
        status: "pending" as const,
        priority: intent.priority ?? ("medium" as const),
        dueDate: intent.dueDate,
        subtasks: [],
        contextTriggers: [],
        delegatedTo: intent.assignee,
        createdBy: auth.user.id,
        tags: ["voice"],
        createdAt: now,
        updatedAt: now,
      };

      const result = await tasks.insertOne(taskDoc);
      taskId = result.insertedId.toString();
      task = { ...taskDoc, _id: taskId };
      await invalidateCache(`tasks:${auth.user.id}:*`);
    } else if (intent.action === "update" && intent.taskTitle) {
      const existing = await findTaskByTitle(tasks, auth.user.id, intent.taskTitle);
      if (existing) {
        const updated = await tasks.findOneAndUpdate(
          { _id: existing._id, createdBy: auth.user.id },
          { $set: { status: "completed", updatedAt: now } },
          { returnDocument: "after" }
        );
        taskId = existing._id!.toString();
        task = updated ? { ...updated, _id: taskId } : undefined;
        message = actionMessage("update", existing.title);
        await invalidateCache(`tasks:${auth.user.id}:*`);
      } else {
        success = false;
        message = actionMessage("update", intent.taskTitle, false);
      }
    } else if (intent.action === "delete" && intent.taskTitle) {
      const existing = await findTaskByTitle(tasks, auth.user.id, intent.taskTitle);
      if (existing) {
        await tasks.deleteOne({ _id: existing._id, createdBy: auth.user.id });
        taskId = existing._id!.toString();
        message = actionMessage("delete", existing.title);
        await invalidateCache(`tasks:${auth.user.id}:*`);
      } else {
        success = false;
        message = actionMessage("delete", intent.taskTitle, false);
      }
    } else if (intent.action === "query") {
      const results = await tasks
        .find({ createdBy: auth.user.id, status: { $ne: "cancelled" } })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray();
      message =
        results.length > 0
          ? `You have ${results.length} recent task${results.length === 1 ? "" : "s"}.`
          : "You have no tasks yet.";
    }

    const sessions = await getVoiceSessionsCollection(db);
    await sessions.insertOne({
      userId: auth.user.id,
      inputText: transcript,
      parsedIntent: intent,
      taskId,
      model: "llama-3.3-70b-versatile",
      confidence: intent.confidence,
      timestamp: now,
    });

    return NextResponse.json({
      transcript,
      intent,
      taskId,
      task: task ? { ...task, _id: task._id?.toString() } : undefined,
      message,
      success,
    });
  } catch (err) {
    console.error("Voice input error:", err);
    return NextResponse.json({ error: "Voice processing failed" }, { status: 500 });
  }
}
