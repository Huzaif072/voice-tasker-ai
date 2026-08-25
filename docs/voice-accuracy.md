# Voice accuracy measurement

The repository includes `npm run evaluate:voice`, a deterministic intent benchmark with labeled examples for create, update, delete, query, and delegation commands. It checks the fallback parser’s action classification and fails when the measured accuracy is below `VOICE_ACCURACY_TARGET`, which defaults to `0.90`.

```bash
VOICE_ACCURACY_TARGET=0.90 npm run evaluate:voice
```

This benchmark is a regression guard for intent routing; it is not a claim that speech-to-text accuracy is above 90 percent. A production accuracy claim requires a consented, representative evaluation set containing audio, reference transcripts, expected intent actions, and expected extracted fields. The evaluation process should calculate word error rate, action accuracy, field exact-match or tolerance accuracy, and failure rates by language, microphone type, and noise condition.

The browser recorder now uploads short MediaRecorder chunks sequentially to the authenticated `/api/voice/chunk` endpoint and sends an upload ID to `/api/voice/input` for server-side assembly. Each upload expires after 15 minutes, is capped at one minute/eight megabytes, and is deleted after successful assembly. The existing direct multipart path remains as a compatibility fallback. This is streamed upload and bounded server-side assembly; it is not provider-side incremental transcription or partial transcript display.

When real labeled audio is available, place it outside the repository or in an approved encrypted test-data store. Do not commit personal recordings, raw transcripts, or personally identifying evaluation data to Git. The minimum useful corpus is 100 or more consented recordings from representative users, with one JSONL row per recording containing an opaque ID, audio path, language, reference transcript, expected action, expected extracted fields, microphone/noise metadata, and consent/retention metadata. Run the transcription provider against each recording and calculate word-error rate, action accuracy, field exact-match or tolerance accuracy, and failure rates by language, microphone type, and noise condition. Do not publish a >90 percent claim unless the predeclared test split passes the chosen metric threshold.
