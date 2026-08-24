import { getGroqClient, GROQ_MODEL } from "./client";
import type { ParsedIntent } from "@/types/voice";

function buildSystemPrompt(): string {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const year = now.getFullYear();

  return `You are an intent parser for VoiceTasker AI, a voice-first task management app.
Parse the user's voice input into structured JSON intent.

IMPORTANT DATE RULES:
- Today's date is ${today}. The current year is ${year}.
- When the user says relative dates like "today", "tomorrow", "Friday", "next week", compute the dueDate relative to today.
- Always use year ${year} unless the user explicitly mentions a different year.
- Never use 2024 or other outdated years.

TASK TITLE RULES:
- Extract a clean, concise task title (not the full spoken sentence).
- Remove filler phrases like "create a task", "add a task", "I need to", "remind me to".
- For complete/delete actions, extract only the task name being referenced.

ACTION RULES:
- "complete", "done", "finished", "mark as complete" → action: "update" (mark task completed)
- "delete", "remove", "cancel task" → action: "delete"
- "create", "add", "new task", "remind me" → action: "create"
- "what", "show", "list" → action: "query"

Respond ONLY with valid JSON matching this schema:
{
  "action": "create" | "update" | "delete" | "query" | "delegate" | "unknown",
  "taskTitle": string (optional),
  "priority": "low" | "medium" | "high" | "urgent" (optional),
  "dueDate": ISO8601 string (optional),
  "assignee": string email (optional),
  "rawQuery": string,
  "confidence": number 0-1
}`;
}

export function normalizeDueDate(dueDate?: string): string | undefined {
  if (!dueDate) return undefined;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return undefined;

  const currentYear = new Date().getFullYear();
  if (parsed.getFullYear() < currentYear) {
    parsed.setFullYear(currentYear);
  }
  return parsed.toISOString();
}

export function cleanTaskTitle(title: string): string {
  return title
    .replace(/^(please\s+)?(create|add|make|set up|schedule)\s+(a\s+)?(new\s+)?task\s+(to\s+|for\s+)?/i, "")
    .replace(/^(please\s+)?(remind me to|i need to|i want to|i have to)\s+/i, "")
    .replace(/^(please\s+)?(complete|finish|mark|delete|remove|cancel)\s+(the\s+)?(task\s+)?(called\s+|named\s+|titled\s+)?/i, "")
    .replace(/^(the\s+)?task\s+(called\s+|named\s+|titled\s+)?/i, "")
    .replace(/\s+(task|please)$/i, "")
    .trim();
}

export async function parseIntent(inputText: string): Promise<ParsedIntent & { confidence: number }> {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: inputText },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    const parsed = JSON.parse(content);
    const taskTitle = parsed.taskTitle ? cleanTaskTitle(parsed.taskTitle) : undefined;

    return {
      action: parsed.action ?? "unknown",
      taskTitle,
      priority: parsed.priority,
      dueDate: normalizeDueDate(parsed.dueDate),
      assignee: parsed.assignee,
      rawQuery: parsed.rawQuery ?? inputText,
      confidence: parsed.confidence ?? 0.5,
    };
  } catch {
    return basicRegexIntent(inputText);
  }
}

export function basicRegexIntent(inputText: string): ParsedIntent & { confidence: number } {
  const lower = inputText.toLowerCase();
  let action: ParsedIntent["action"] = "create";

  if (lower.includes("delete") || lower.includes("remove")) action = "delete";
  else if (lower.includes("complete") || lower.includes("done") || lower.includes("finished"))
    action = "update";
  else if (lower.includes("what") || lower.includes("show") || lower.includes("list"))
    action = "query";
  else if (lower.includes("assign") || lower.includes("delegate")) action = "delegate";

  const taskTitle = cleanTaskTitle(
    inputText.replace(/^(create|add|delete|remove|complete|finish|mark)\s+(the\s+)?(task\s+)?/i, "")
  );

  return {
    action,
    taskTitle: taskTitle || undefined,
    rawQuery: inputText,
    confidence: 0.4,
  };
}
