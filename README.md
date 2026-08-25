# VoiceTasker AI

VoiceTasker AI is a voice-first task manager built with Next.js, React, TypeScript, MongoDB, Groq-powered transcription and intent parsing, optional Redis caching, and optional OAuth, email, push, and Socket.IO integrations. The dashboard supports task creation and editing, subtasks, delegation, task search, summaries, notifications, voice commands, account export, and permanent account deletion.

## Local development

Use Node.js 20 or newer. Copy the environment template, fill the server-side values, install dependencies, and start the development server:

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

The application runs at `http://localhost:3000`. `MONGODB_URI` and a strong `JWT_SECRET` are required for authenticated flows. OAuth, Groq, Redis, SMTP, push, Socket.IO, and local Whisper values are optional integrations; leave them blank or disabled when they are not configured.

## Validation commands

Run the complete local regression suite before opening a pull request:

```bash
npm run test:all
npm run lint
npm run build
npm audit --omit=dev
```

The smoke tests cover authentication/session contracts, deterministic voice parsing and confirmation binding, task normalization and ownership, notification lifecycle, delegation validation, API contracts, account export allowlisting, and reminder preferences. The production build performs the repository's TypeScript validation; the runtime audit must also report zero advisories.

## Task reminders

A task may contain an explicit `reminderAt` timestamp. The application stores timestamps as ISO UTC strings and displays them in the user's local timezone. Users can enable reminders and select the in-app, email, and push channels from Account Security; in-app delivery remains the idempotent ledger and fallback channel. Completed and cancelled tasks are skipped.

The callback is intentionally a protected interface rather than an in-process timer. Configure a deployed scheduler, managed cron provider, or persistent worker to send a `POST` request to `/api/scheduled/reminders` at the desired frequency. The callback must include the server-only secret:

```bash
curl -X POST "https://YOUR_PUBLIC_DOMAIN/api/scheduled/reminders" \
  -H "Authorization: Bearer ${REMINDER_WORKER_SECRET}"
```

For a six-field UTC scheduler, a five-minute cadence is represented as `0 */5 * * * *`; use the equivalent expression when the provider uses five fields. Configure `REMINDER_WORKER_SECRET` in the deployed environment, never in browser code, source control, or a client-visible variable. The endpoint is safe to retry because the notification index prevents duplicate reminder records. A local manual run can use the same request against `http://localhost:3000` while the development server is running.

## Account controls

The Security page can revoke all JWT sessions, download a sanitized JSON export, unlink configured OAuth providers, and permanently delete the account after explicit confirmation. Exports omit password hashes, reset and verification token material, and other authentication secrets. Account deletion removes user-owned tasks, notifications, voice sessions, and the user record; the endpoint clears the current session cookie after successful deletion.

The current authentication design provides account-wide session invalidation through `sessionVersion`. It does not maintain a durable per-device session inventory, so the UI deliberately exposes account-wide logout rather than presenting unimplemented device-level controls. Account deletion uses a MongoDB transaction when supported and an idempotent collection-by-collection fallback for standalone deployments.

## Operational endpoints and configuration

`GET /api/health` performs a no-store MongoDB readiness check and returns HTTP 503 when the database is unavailable. The reminder callback is protected separately from normal user routes and returns user-safe errors. Keep application logs free of tokens, passwords, raw audio, and full export payloads.

The optional Socket.IO client is disabled unless `NEXT_PUBLIC_SOCKET_ENABLED=true` and a reachable `NEXT_PUBLIC_SOCKET_URL` are configured. The local Whisper fallback requires the external binary and model paths documented in `.env.local.example`; the hosted transcription path remains the default when Groq is configured.

## Applying a patch from the maintainer

Patches are distributed as unified diffs against the stated GitHub commit. Apply one from the repository root, then validate and commit locally:

```bash
git apply --check voice-tasker-ai-all-roadmap-v2.diff
git apply voice-tasker-ai-all-roadmap-v2.diff
npm install
npm run test:all
npm run lint
npm run build
git diff --check
git status
```

Do not commit `.env.local`, provider credentials, local Whisper binaries, model files, or exported account JSON files.
