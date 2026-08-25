import { getGroqClient, GROQ_MODEL } from "./client";
import type { ParsedIntent } from "@/types/voice";
import type { ContextTrigger, Subtask } from "@/types/task";

function buildSystemPrompt(): string {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const year = now.getFullYear();

  return `You are an intent parser for VoiceTasker AI, a voice-first task management app.
Parse the user's voice input into structured JSON intent.

IMPORTANT DATE RULES:
- Today's date is ${today}. The current year is ${year}.
- When the user says relative dates like "today", "tomorrow", "Friday", "next week", compute the dueDate relative to today.
- If the user asks to be reminded at a time, return reminderAt as an ISO8601 timestamp.
- Always use year ${year} unless the user explicitly mentions a different year.
- Never use 2024 or other outdated years.

TASK TITLE RULES:
- Extract a clean, concise task title (not the full spoken sentence).
- Remove filler phrases like "create a task", "add a task", "I need to", "remind me to".
- For complete/delete actions, extract only the task name being referenced.

ACTION RULES:
- "complete", "done", "finished", "mark as complete" → action: "update" (mark task completed unless another field is explicitly being changed)
- "change priority", "make urgent", "move the deadline", or "reschedule" → action: "update" with the changed fields
- "delete", "remove", "cancel task" → action: "delete"
- "create", "add", "new task", "remind me" → action: "create"
- "what", "show", "list" → action: "query"
- "assign", "delegate", "ask [person]" → action: "delegate"

For a created task, include any explicitly spoken description, duration, deadline, reminder, calendar keyword, subtasks, dependencies, or context trigger. A time context trigger value must be an ISO8601 timestamp. Use context trigger types location, time, calendar, weather, or keyword. For delegation, return either an assignee email or an E.164 assigneePhone when provided.

Respond ONLY with valid JSON matching this schema:
{
  "action": "create" | "update" | "delete" | "query" | "delegate" | "unknown",
  "taskTitle": string (optional),
  "description": string (optional),
  "priority": "low" | "medium" | "high" | "urgent" (optional),
  "dueDate": ISO8601 string (optional),
  "reminderAt": ISO8601 string (optional),
  "durationMinutes": number (optional),
  "calendarQuery": string (optional),
  "assignee": string email (optional),
  "assigneePhone": string E.164 phone (optional),
  "subtasks": [{"id": string, "title": string, "completed": false}] (optional),
  "dependencies": [24-character MongoDB task IDs] (optional),
  "contextTriggers": [{"type": string, "value": string, "latitude": number, "longitude": number, "radiusMeters": number, "condition": string, "recurrence": "hourly" | "daily" | "weekly"}] (optional),
  "rawQuery": string,
  "confidence": number 0-1
}`;
}

export function normalizeDueDate(dueDate?: string): string | undefined {
  if (!dueDate) return undefined;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return undefined;

  const currentYear = new Date().getFullYear();
  if (parsed.getFullYear() < currentYear) parsed.setFullYear(currentYear);
  return parsed.toISOString();
}

export function normalizeReminderAt(reminderAt?: string): string | undefined {
  return normalizeDueDate(reminderAt);
}

export function normalizeDurationMinutes(value: unknown): number | undefined {
  const minutes = typeof value === "number" ? value : Number(value);
  return Number.isFinite(minutes) && minutes > 0 && minutes <= 24 * 60 ? Math.round(minutes) : undefined;
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

function normalizeSubtasks(value: unknown): Subtask[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const subtasks = value.filter((item): item is { id?: unknown; title?: unknown; completed?: unknown } => Boolean(item && typeof item === "object"))
    .map((item, index) => ({ id: typeof item.id === "string" && item.id.trim() ? item.id.trim().slice(0, 100) : `voice-subtask-${index + 1}`, title: typeof item.title === "string" ? item.title.trim().slice(0, 500) : "", completed: item.completed === true }))
    .filter((item) => item.title.length > 0)
    .slice(0, 100);
  return subtasks.length ? subtasks : undefined;
}

function normalizeContextTriggers(value: unknown): ContextTrigger[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set<ContextTrigger["type"]>(["location", "time", "calendar", "weather", "keyword"]);
  const triggers = value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => {
      const type = typeof item.type === "string" && allowed.has(item.type as ContextTrigger["type"]) ? item.type as ContextTrigger["type"] : null;
      const valueText = typeof item.value === "string" ? item.value.trim().slice(0, 200) : "";
      if (!type || !valueText) return null;
      const trigger: ContextTrigger = { type, value: valueText };
      if (typeof item.latitude === "number" && Number.isFinite(item.latitude) && item.latitude >= -90 && item.latitude <= 90) trigger.latitude = item.latitude;
      if (typeof item.longitude === "number" && Number.isFinite(item.longitude) && item.longitude >= -180 && item.longitude <= 180) trigger.longitude = item.longitude;
      if (typeof item.radiusMeters === "number" && Number.isInteger(item.radiusMeters) && item.radiusMeters >= 25 && item.radiusMeters <= 100_000) trigger.radiusMeters = item.radiusMeters;
      if (typeof item.condition === "string") trigger.condition = item.condition.trim().slice(0, 100);
      if (item.recurrence === "hourly" || item.recurrence === "daily" || item.recurrence === "weekly") trigger.recurrence = item.recurrence;
      if (type === "time" && !normalizeDueDate(valueText)) return null;
      if ((type === "location" || type === "weather") && (trigger.latitude === undefined || trigger.longitude === undefined)) return null;
      if (type !== "time") delete trigger.recurrence;
      return trigger;
    })
    .filter((trigger): trigger is ContextTrigger => Boolean(trigger))
    .slice(0, 20);
  return triggers.length ? triggers : undefined;
}

function normalizeIntent(parsed: Record<string, unknown>, inputText: string): ParsedIntent & { confidence: number } {
  return {
    action: ["create", "update", "delete", "query", "delegate", "unknown"].includes(String(parsed.action)) ? parsed.action as ParsedIntent["action"] : "unknown",
    taskTitle: typeof parsed.taskTitle === "string" ? cleanTaskTitle(parsed.taskTitle) : undefined,
    description: typeof parsed.description === "string" ? parsed.description.trim().slice(0, 5000) : undefined,
    priority: ["low", "medium", "high", "urgent"].includes(String(parsed.priority)) ? parsed.priority as ParsedIntent["priority"] : undefined,
    dueDate: normalizeDueDate(typeof parsed.dueDate === "string" ? parsed.dueDate : undefined),
    reminderAt: normalizeReminderAt(typeof parsed.reminderAt === "string" ? parsed.reminderAt : undefined),
    durationMinutes: normalizeDurationMinutes(parsed.durationMinutes),
    calendarQuery: typeof parsed.calendarQuery === "string" ? parsed.calendarQuery.trim().slice(0, 200) : undefined,
    assignee: typeof parsed.assignee === "string" ? parsed.assignee.trim().toLowerCase().slice(0, 320) : undefined,
    assigneePhone: typeof parsed.assigneePhone === "string" ? parsed.assigneePhone.trim().slice(0, 16) : undefined,
    subtasks: normalizeSubtasks(parsed.subtasks),
    dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies.filter((id): id is string => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)).slice(0, 50) : undefined,
    contextTriggers: normalizeContextTriggers(parsed.contextTriggers),
    rawQuery: typeof parsed.rawQuery === "string" ? parsed.rawQuery : inputText,
    confidence: typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence) ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
  };
}

export async function parseIntent(inputText: string): Promise<ParsedIntent & { confidence: number }> {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: buildSystemPrompt() }, { role: "user", content: inputText }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");
    return normalizeIntent(JSON.parse(content), inputText);
  } catch {
    return basicRegexIntent(inputText);
  }
}

export function basicRegexIntent(inputText: string): ParsedIntent & { confidence: number } {
  const lower = inputText.toLowerCase();
  let action: ParsedIntent["action"] = "create";
  if (lower.includes("delete") || lower.includes("remove")) action = "delete";
  else if (lower.includes("complete") || lower.includes("done") || lower.includes("finished")) action = "update";
  else if (lower.includes("what") || lower.includes("show") || lower.includes("list")) action = "query";
  else if (lower.includes("assign") || lower.includes("delegate") || lower.includes("ask ")) action = "delegate";

  const taskTitle = cleanTaskTitle(inputText.replace(/^(create|add|delete|remove|complete|finish|mark)\s+(the\s+)?(task\s+)?/i, ""));
  const durationMatch = lower.match(/(?:for|lasting)\s+(\d+)\s*(minutes?|hours?)/);
  const durationMinutes = durationMatch ? Number(durationMatch[1]) * (durationMatch[2].startsWith("hour") ? 60 : 1) : undefined;
  const phone = inputText.match(/\+[1-9]\d{7,14}/)?.[0];
  return {
    action,
    taskTitle: taskTitle || undefined,
    durationMinutes: normalizeDurationMinutes(durationMinutes),
    calendarQuery: lower.includes("calendar") ? taskTitle : undefined,
    assigneePhone: phone,
    rawQuery: inputText,
    confidence: 0.4,
  };
}
