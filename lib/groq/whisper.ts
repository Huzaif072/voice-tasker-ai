import { getGroqClient, WHISPER_MODEL } from "./client";

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType = "audio/webm"
): Promise<string> {
  const groq = getGroqClient();
  const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("wav") ? "wav" : "webm";

  const file = new File([new Uint8Array(audioBuffer)], `audio.${ext}`, { type: mimeType });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language: "en",
    response_format: "text",
  });

  return typeof transcription === "string" ? transcription : String(transcription);
}
