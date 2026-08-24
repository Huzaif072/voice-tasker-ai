import { z } from "zod";

const audioMimeType = z.string().refine(
  (value) => /^audio\/(webm|mp4|wav|mpeg|ogg)(?:;.*)?$/i.test(value),
  "Unsupported audio format"
).transform((value) => value.split(";", 1)[0].toLowerCase());

export const voiceInputSchema = z
  .object({
    text: z.string().trim().min(1).max(10000).optional(),
    audio: z.string().max(12_000_000).optional(),
    mimeType: audioMimeType.optional(),
    confirm: z.boolean().optional(),
    confirmationToken: z.string().max(512).optional(),
  })
  .refine((value) => Boolean(value.text) !== Boolean(value.audio), {
    message: "Provide exactly one of text or audio input",
  });

export type VoiceInput = z.infer<typeof voiceInputSchema>;
