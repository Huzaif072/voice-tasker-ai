import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not defined");
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const RETIRED_GROQ_MODELS = new Set(["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]);
const configuredGroqModel = process.env.GROQ_MODEL?.trim();
export const GROQ_MODEL = configuredGroqModel && !RETIRED_GROQ_MODELS.has(configuredGroqModel) ? configuredGroqModel : DEFAULT_GROQ_MODEL;
export const WHISPER_MODEL = "whisper-large-v3";
