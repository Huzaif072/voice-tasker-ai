import { z } from "zod";

export const voiceInputSchema = z.object({
  text: z.string().min(1).max(10000).optional(),
  audio: z.string().optional(),
  mimeType: z
    .enum(["audio/webm", "audio/mp4", "audio/wav", "audio/mpeg", "audio/ogg"])
    .optional(),
});

export type VoiceInput = z.infer<typeof voiceInputSchema>;
