import { z } from "zod";

const audioMimeType = z.string().refine(
  (value) => /^audio\/(webm|mp4|wav|mpeg|ogg)(?:;.*)?$/i.test(value),
  "Unsupported audio format"
).transform((value) => value.split(";", 1)[0].toLowerCase());

export const voiceUploadInitSchema = z.object({
  mimeType: audioMimeType.default("audio/webm"),
});

export const voiceChunkSchema = z.object({
  uploadId: z.string().regex(/^[a-f0-9-]{20,80}$/i, "Invalid upload ID"),
  index: z.coerce.number().int().min(0).max(239),
});

export const voiceInputSchema = z
  .object({
    text: z.string().trim().min(1).max(10000).optional(),
    audio: z.string().max(12_000_000).optional(),
    mimeType: audioMimeType.optional(),
    confirm: z.boolean().optional(),
    confirmationToken: z.string().max(512).optional(),
    conversationId: z.string().trim().regex(/^[a-zA-Z0-9_-]{8,100}$/, "Invalid conversation ID").optional(),
    uploadId: z.string().regex(/^[a-f0-9-]{20,80}$/i, "Invalid upload ID").optional(),
  })
  .refine((value) => value.uploadId ? !value.text && !value.audio : Boolean(value.text) !== Boolean(value.audio), {
    message: "Provide exactly one of text, audio, or upload ID",
  });

export type VoiceInput = z.infer<typeof voiceInputSchema>;
