import { getGroqClient, GROQ_MODEL } from "./client";
import type { Task } from "@/types/task";

export async function generateSummary(
  tasks: Task[],
  period: "daily" | "weekly" = "daily"
): Promise<string> {
  try {
    const groq = getGroqClient();
    const taskSummary = tasks
      .slice(0, 50)
      .map((t) => `- [${t.status}] ${t.title} (${t.priority})`)
      .join("\n");

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: `Generate a concise ${period} voice briefing summary for the user. Keep it under 200 words, conversational tone suitable for text-to-speech.`,
        },
        {
          role: "user",
          content: `Tasks:\n${taskSummary || "No tasks."}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    return completion.choices[0]?.message?.content ?? "No summary available.";
  } catch {
    const pending = tasks.filter((t) => t.status === "pending").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return `You have ${pending} pending tasks and ${completed} completed.`;
  }
}
