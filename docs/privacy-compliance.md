# Privacy and GDPR operations checklist

The application now provides technical controls for consent, portability, erasure, retention, encrypted application fields, and privacy-request intake. Legal compliance still depends on the deployment owner’s organization, jurisdiction, providers, processing purposes, and operating procedures.

## Technical controls included in the application

The application records versioned Terms and Privacy Policy acceptance, exposes renewal and withdrawal in Account Security, writes immutable acceptance/withdrawal events, includes consent history in account exports, and deletes consent records during account deletion. Authenticated users can submit access, erasure, rectification, restriction, and objection requests through `POST /api/account/privacy-requests`; request metadata is owner-scoped, details are encrypted, and records are retained only for the configured operational audit period.

Account export includes the profile, decrypted task content, notifications, voice sessions, reminder deliveries, consent history, invitations without secret token hashes, and privacy-request records. Account deletion removes tasks, notifications, voice sessions, reminders, invitations, analytics, privacy requests, and abandoned streaming uploads before deleting the user record. MongoDB transactions are used when supported, with the existing safe fallback for deployments without transaction support.

New task-authored content—title, description, calendar query, subtasks, context triggers, tags, and delegation contacts—is stored in an AES-256-GCM envelope. New push subscriptions, voice session content, notification messages, and privacy-request details are encrypted as well. Structural metadata required for ownership, status, scheduling, retention, and assignment indexes remains queryable. Existing task records require the explicit `npm run migrate:encrypt-tasks` migration; the migration must be tested against a backup or staging copy first.

Voice chunks are authenticated, owner-scoped, rate-limited, bounded to eight MiB and 15 minutes, protected by MongoDB TTL indexes, and deleted after successful assembly. Voice and temporary-upload records do not constitute a permanent audio archive.

## Deployment-owner and controller responsibilities

1. Identify the data controller, privacy contact, processing purposes, legal basis, data-subject categories, storage regions, and response deadlines.
2. Publish the actual enabled subprocessors, including the database, AI/transcription provider, email provider, push provider, hosting platform, monitoring service, calendar provider, and SMS provider.
3. Sign appropriate data-processing agreements and review provider retention, training-use, residency, and deletion terms. Do not send personal recordings to an unapproved provider.
4. Configure `FIELD_ENCRYPTION_KEY` in a secret manager, restrict access, rotate it only through a tested re-encryption migration, and protect database backups.
5. Configure `VOICE_SESSION_RETENTION_DAYS`, `NOTIFICATION_RETENTION_DAYS`, and `ANALYTICS_RETENTION_DAYS` to documented values. Configure log, object-storage, provider, and backup expiration separately because application TTL indexes do not erase provider backups or platform logs.
6. Assign an operator for privacy requests, verify requester identity where necessary, update request statuses, document decisions, and respond within the applicable legal period. The request API records intake; it does not itself make a legal determination.
7. Maintain incident response, breach assessment and notification procedures, access reviews, vulnerability management, restore testing, and a record of processing activities.
8. Review invitation, AI, email, SMS, push, calendar, and monitoring disclosures as personal-data processing. Delegation should be used only when the task owner has a lawful basis to contact the recipient.
9. Configure HTTPS/WSS, database TLS, CDN policy, secret management, and hosting-provider data-region and backup settings before production use.

Do not describe the product as legally compliant solely because these code controls are present. The deployed configuration and operating organization determine the final compliance position.
