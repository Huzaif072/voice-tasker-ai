# Voice accuracy measurement

The repository includes `npm run evaluate:voice`, a deterministic intent benchmark with labeled examples for create, update, delete, query, and delegation commands. It checks the fallback parser’s action classification and fails when the measured accuracy is below `VOICE_ACCURACY_TARGET`, which defaults to `0.90`.

```bash
VOICE_ACCURACY_TARGET=0.90 npm run evaluate:voice
```

This benchmark is a regression guard for intent routing; it is not a claim that speech-to-text accuracy is above 90 percent. A production accuracy claim requires a consented, representative evaluation set containing audio, reference transcripts, expected intent actions, and expected extracted fields. The evaluation process should calculate word error rate, action accuracy, field exact-match or tolerance accuracy, and failure rates by language, microphone type, and noise condition.

The browser recorder now uses short MediaRecorder chunks, a 64 kbps audio target, a one-minute duration limit, and an eight-megabyte request limit. The server accepts multipart audio and rejects oversized files before converting them for transcription. These changes reduce client-side base64 expansion and bound memory use, but they do not replace streaming transcription.

When real labeled audio is available, add it outside the repository or through an approved test-data store. Do not commit personal recordings, raw transcripts, or personally identifying evaluation data to Git.
