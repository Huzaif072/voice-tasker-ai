import { getGroqClient, GROQ_MODEL } from "./client";
import type { Task } from "@/types/task";

const fallback = (task: Task) => [
  ...(task.subtasks?.length ? ["Which subtask should we tackle next?"] : ["Break this into smaller steps"]),
  ...(task.reminderAt ? ["Move or remove the reminder"] : ["Set a reminder for tomorrow"]),
  ...(task.dependencies?.length ? ["Show the tasks blocking this one"] : ["What priority should this have?"]),
  ...(task.delegatedTo || task.delegatedPhone ? ["Check the delegation status"] : ["Delegate to a teammate"]),
];

export async function generateFollowUps(task: Task): Promise<string[]> {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: "Suggest exactly four concise next actions for a voice-first task assistant. Return only a JSON array of strings. Actions must be safe, concrete, and relevant to the task." },
        { role: "user", content: JSON.stringify({ title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.dueDate, subtasks: task.subtasks?.map((item) => item.title), dependencies: task.dependencies?.length ?? 0, delegated: Boolean(task.delegatedTo || task.delegatedPhone) }) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 160,
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) return fallback(task);
    const parsed = JSON.parse(content) as { prompts?: unknown; actions?: unknown } | unknown[];
    const values = Array.isArray(parsed) ? parsed : (parsed as { prompts?: unknown; actions?: unknown }).prompts ?? (parsed as { actions?: unknown }).actions;
    if (!Array.isArray(values)) return fallback(task);
    const prompts = values.filter((value): value is string => typeof value === "string" && value.trim().length > 0).map((value) => value.trim().slice(0, 120)).slice(0, 4);
    return prompts.length === 4 ? prompts : fallback(task);
  } catch {
    return fallback(task);
  }
}
