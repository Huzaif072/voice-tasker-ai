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

export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const WHISPER_MODEL = "whisper-large-v3";
