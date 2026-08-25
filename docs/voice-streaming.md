# Voice streaming and encrypted storage

## Upload protocol

The browser records short `MediaRecorder` chunks and uploads them sequentially to `POST /api/voice/chunk`. The first request omits `uploadId`; the response returns one. Every following request includes that upload ID and a zero-based `index`. After the final chunk, the browser sends `{ "uploadId": "...", "conversationId": "..." }` to `POST /api/voice/input`. The server verifies ownership, checks contiguous chunk indexes, assembles the bounded audio buffer, deletes the temporary chunk records, and passes the assembled audio to the existing transcription provider with local fallback.

Each upload expires after 15 minutes. A single chunk is limited to 256 KiB, an upload is limited to 240 chunks and eight MiB, and all upload operations require an authenticated session and rate limit. MongoDB TTL indexes remove abandoned upload metadata and chunks. The browser retries each chunk with backoff, persists the upload ID and next index in local storage, resumes after a transient failure, and exposes a retry action if finalization fails. A new recording clears the previous checkpoint. This protocol streams upload transport and reduces browser memory/base64 expansion.

The separate live-voice control uses the browser SpeechRecognition API when supported. Interim words are shown in the live transcript, final segments are accumulated into one command, and the command is submitted once recognition ends. This gives live partial transcription in supported browsers; the recorded-chunk path remains the privacy-preserving fallback when browser recognition is unavailable.

## Encryption scope

New task-authored content is stored in an AES-256-GCM encrypted envelope: title, description, calendar query, subtasks, context triggers, tags, and delegation contact values. New browser push subscriptions, voice session content, notification messages, and privacy-request details are also encrypted. Structural metadata needed for ownership, status, scheduling, TTL cleanup, and assignment indexes remains queryable. Existing plaintext records continue to read safely until the migration is run.

Configure a stable, randomly generated `FIELD_ENCRYPTION_KEY` with at least 32 characters in every application and worker environment. Never rotate or replace it without a tested re-encryption migration and backup plan. Run the task migration after setting the key:

```bash
npm run migrate:encrypt-tasks
```

The migration is idempotent for records that already contain `contentEncrypted` and also populates keyed blind-search tokens. Test it on a backup or staging copy first. Provider-managed database backups, logs, AI-provider payloads, email, SMS, and push delivery systems require their own encryption, retention, and deletion configuration.

Phone-only task invitations include a six-digit code in the outbound SMS. The code is stored only as a hash, expires after 15 minutes, and is limited to five failed attempts. The recipient must enter the code on the invitation page before accepting or declining. SMS delivery requires the existing Twilio configuration; email invitations continue to use invited-email binding.
