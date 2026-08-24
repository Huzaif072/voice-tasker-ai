import { getGroqClient, GROQ_MODEL } from "./client";

export interface DecomposedSubtask {
  title: string;
  priority: "low" | "medium" | "high";
}

export async function decomposeTask(
  title: string,
  description?: string
): Promise<DecomposedSubtask[]> {
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: `Break down the given task into 3-8 actionable subtasks. Respond with JSON: { "subtasks": [{ "title": string, "priority": "low"|"medium"|"high" }] }`,
        },
        {
          role: "user",
          content: `Task: ${title}${description ? `\nDescription: ${description}` : ""}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = JSON.parse(content);
    return parsed.subtasks ?? [];
  } catch {
    return [{ title: `Plan: ${title}`, priority: "medium" as const }];
  }
}
