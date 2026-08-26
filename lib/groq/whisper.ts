import { getGroqClient, WHISPER_MODEL } from "./client";

export type TranscriptionLanguage = "auto" | "en" | "ur";

const VOICETASKER_TRANSCRIPTION_PROMPT = [
  "VoiceTasker AI task command.",
  "Common terms: task, deadline, due date, reminder, priority, urgent, high priority, medium priority, low priority, complete, update, delete, delegate, assign, subtasks, dependency, calendar, today, tomorrow, meeting, report.",
  "Preserve names, numbers, dates, and times exactly when audible.",
].join(" ");

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType = "audio/webm",
  language: TranscriptionLanguage = "auto",
): Promise<string> {
  const groq = getGroqClient();
  const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : mimeType.includes("mpeg") ? "mp3" : mimeType.includes("ogg") ? "ogg" : "webm";
  const file = new File([new Uint8Array(audioBuffer)], `audio.${ext}`, { type: mimeType });
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    ...(language === "auto" ? {} : { language }),
    prompt: VOICETASKER_TRANSCRIPTION_PROMPT,
    response_format: "text",
    temperature: 0,
  });
  return typeof transcription === "string" ? transcription : String(transcription);
}
