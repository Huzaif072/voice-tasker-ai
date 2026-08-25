# VoiceTasker AI

VoiceTasker AI is a voice-first task manager built with Next.js, React, TypeScript, MongoDB, Groq-powered transcription and intent parsing, optional Redis caching, and optional OAuth, email, push, and Socket.IO integrations. The dashboard supports task creation and editing, subtasks, delegation, task search, summaries, notifications, voice commands, account export, and permanent account deletion.

## Local development

Use Node.js 24 or newer. Copy the environment template, fill the server-side values, install dependencies, and start the development server:

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
npm run check:workflows
npm run check:sentry-config
npm run lint
npm run build
npm audit --omit=dev
```

The smoke tests cover authentication/session contracts, deterministic voice parsing and confirmation binding, task normalization and ownership, notification lifecycle, delegation validation, API contracts, account export allowlisting, reminder preferences, route authorization boundaries, provider-health response safety, reminder-worker retry behavior, and email/push failure classification. The production build performs the repository's TypeScript validation; the runtime audit must also report zero advisories. Browser checks can be run with `npm run test:e2e`; `npm run test:e2e:prod` runs them against the compiled `next start` server. Authenticated flows are enabled by setting `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`. `npm run check:sentry-config` verifies that deployment-only Sentry source-map credentials are complete and that server/browser release identifiers match; it does not contact Sentry.

Voice sessions retain an owner-scoped conversation ID, the last affected task, and the last query result so follow-ups such as “complete the first one,” “update this task,” and confirmation replies can be resolved without exposing another user's data. Voice creation accepts descriptions, deadlines, reminders, durations, dependencies, subtasks, context triggers, email or E.164 phone delegation, and a Google Calendar compose link. Google Calendar OAuth remains read-only; compose links are explicit user-open links rather than automatic provider writes. Task results are ordered by priority rank, due time, and creation time, and task cards include a tomorrow reschedule action.

The dashboard records only bounded positive/negative feedback categories through `POST /api/analytics/feedback`. `GET /api/analytics/overview` exposes rolling active-day, voice-confidence, event-count, and feedback metrics for the signed-in user. The priority assistant combines explainable deadline/dependency logic with durable aggregate completion behavior and offers an AI deadline suggestion with deterministic fallback.

The authenticated dashboard registers `/push-sw.js` for offline task mutation queuing, background replay, same-browser task-change broadcasts, connectivity status, and the browser install prompt. Offline replay is limited to task mutations and retains authentication-cookie behavior; users should resolve conflicting edits after reconnecting. The optional Socket.IO service remains supported, while a bounded client polling fallback keeps task and notification views fresh when that service is disabled.

## Task reminders

A task may contain an explicit `reminderAt` timestamp. The application stores timestamps as ISO UTC strings and displays them in the user's local timezone. Users can enable reminders and select the in-app, email, and push channels from Account Security; in-app delivery remains the idempotent ledger and fallback channel. Completed and cancelled tasks are skipped. Push delivery requires `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_MAILTO`; the Security page registers `/push-sw.js` and stores only the validated browser subscription. Tasks can also reference owner-scoped dependencies and contextual triggers for time, browser location, Open-Meteo weather, and Google Calendar keyword matches. Time triggers must use ISO timestamps; dependency cycles and cross-account references are rejected.

The callback is intentionally a protected interface rather than an in-process timer. Configure a deployed scheduler, managed cron provider, or persistent worker to send a `POST` request to `/api/scheduled/reminders` at the desired frequency. The callback must include the server-only secret:

```bash
curl -X POST "https://YOUR_PUBLIC_DOMAIN/api/scheduled/reminders" \
  -H "Authorization: Bearer ${REMINDER_WORKER_SECRET}"
```

For a six-field UTC scheduler, a five-minute cadence is represented as `0 */5 * * * *`; use the equivalent expression when the provider uses five fields. Configure `REMINDER_WORKER_SECRET` in the deployed environment, never in browser code, source control, or a client-visible variable. The endpoint is safe to retry because the notification index prevents duplicate reminder records. Optional email and push sends are placed in a per-channel delivery outbox with leases, exponential backoff, and a five-attempt terminal failure state. Sent, cancelled, and terminally failed delivery rows expire automatically after 90 days; pending and leased work is retained. Task completion, cancellation, and deletion cancel pending or leased deliveries, and the worker re-checks task state immediately before sending. Definitively expired push subscriptions are removed after a 404/410 provider response; permanent email recipient failures are not retried. A local manual run can use the same request against `http://localhost:3000` while the development server is running. Run the same protected callback against `/api/scheduled/context` to evaluate time, weather, and Google Calendar triggers; location triggers are evaluated by the opt-in browser heartbeat. Time context triggers are one-shot by default; the task form can mark them as hourly, daily, or weekly. The context worker evaluates every matching user in bounded batches rather than silently stopping at a fixed user count, and weather results are cached per distinct coordinate pair during each user evaluation. Open-Meteo is free for non-commercial fair use within its published limits and requires attribution; commercial production use must follow its paid terms.

## Account controls

The Security page can revoke all JWT sessions, download a sanitized JSON export, unlink configured OAuth providers, and permanently delete the account after explicit confirmation. Exports omit password hashes, reset and verification token material, and other authentication secrets. Account exports are limited to one request per user per hour and reject any individual collection above 10,000 records before loading the export into memory. Account deletion removes user-owned tasks, notifications, voice sessions, and the user record; the endpoint clears the current session cookie after successful deletion.

The current authentication design provides account-wide session invalidation through `sessionVersion`. It does not maintain a durable per-device session inventory, so the UI deliberately exposes account-wide logout rather than presenting unimplemented device-level controls. Account deletion uses a MongoDB transaction when supported and an idempotent collection-by-collection fallback for standalone deployments. Delegation persists delivery state and can send email or optional E.164 SMS through Twilio. Enable `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER` only when SMS delivery is configured.

## Operational endpoints and configuration

`GET /api/health` performs a no-store MongoDB readiness check and returns HTTP 503 when the database is unavailable. Authenticated users can inspect redacted dependency configuration through `GET /api/health/providers`; it never returns credentials or provider error details. Provider checks are independently bounded and report partial statuses instead of failing the entire panel because one optional dependency is slow or unavailable. The reminder and context callbacks are protected separately from normal user routes, emit redacted run metrics, and return user-safe errors. Run `npm run verify:indexes` against a deployment after migrations to verify the unique, claim, owner, and TTL indexes without creating missing indexes. Keep application logs free of tokens, passwords, raw audio, and full export payloads. Browser tests start a local development server by default; set `PLAYWRIGHT_BASE_URL` to test a deployed environment instead.

The optional Socket.IO client is disabled unless `NEXT_PUBLIC_SOCKET_ENABLED=true` and a reachable `NEXT_PUBLIC_SOCKET_URL` are configured. The local Whisper fallback requires the external binary and model paths documented in `.env.local.example`; the hosted transcription path remains the default when Groq is configured. Cache invalidation uses cursor-based Redis `SCAN` rather than blocking wildcard `KEYS`. `npm run check:workflows` fails if a workflow introduces an unpinned external action; Dependabot checks pinned GitHub Actions weekly. Browser speech synthesis reads confirmations and summaries aloud when supported. Configure `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to enable monitoring; personal-data collection remains disabled. For release-aware production issues, set matching `SENTRY_RELEASE` and `NEXT_PUBLIC_SENTRY_RELEASE` values, preferably the deployed commit SHA. Source-map upload additionally requires the server-only `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` during the deployment build; the application deliberately skips upload when that complete set is absent.

The context-aware voice and calendar flows are intentionally explicit about privacy: context-trigger values are validated before storage, the browser location heartbeat is opt-in, calendar access is read-only, and analytics never stores raw audio or summary text. Task mutations made while offline are queued locally in the browser and replayed when connectivity returns; deployment should still provide HTTPS and a backup strategy for production data.

## Staging verification

Use a disposable staging account and database for authenticated browser checks. The manually triggered `.github/workflows/staging-e2e.yml` workflow expects `STAGING_BASE_URL`, `STAGING_E2E_EMAIL`, and `STAGING_E2E_PASSWORD` as secrets in the repository’s `staging` environment, then runs both `npm run test:e2e` and `npm run test:e2e:prod` against the deployed site. Trigger it with `gh workflow run staging-e2e.yml --ref main` after configuring that environment. For a reminder canary, create one synthetic active task with a near-future `reminderAt`, run the protected scheduler callback once, verify one in-app notification and the expected outbox state, then repeat the callback to confirm no duplicate. Complete or cancel the synthetic task and verify pending deliveries become cancelled. Remove the synthetic data after the check. If Google Calendar is enabled, configure the OAuth consent screen for the read-only Calendar scope and re-authenticate test accounts so encrypted refresh tokens are stored.

## Applying a patch from the maintainer

Patches are distributed as unified diffs against the stated GitHub commit. Apply one from the repository root, then validate and commit locally:

```bash
git apply --check voice-tasker-ai-delivery-lifecycle-v4.diff
git apply voice-tasker-ai-delivery-lifecycle-v4.diff
npm install
npm run test:all
npm run lint
npm run build
npm run test:e2e
npm run test:e2e:prod
npm run verify:indexes
git diff --check
git status
```

Do not commit `.env.local`, provider credentials, local Whisper binaries, model files, or exported account JSON files.
