import { z } from "zod";

export const voiceInputSchema = z
  .object({
    text: z.string().trim().min(1).max(10000).optional(),
    audio: z.string().max(12_000_000).optional(),
    mimeType: z
      .enum(["audio/webm", "audio/mp4", "audio/wav", "audio/mpeg", "audio/ogg"])
      .optional(),
    confirm: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.text) !== Boolean(value.audio), {
    message: "Provide exactly one of text or audio input",
  });

export type VoiceInput = z.infer<typeof voiceInputSchema>;
