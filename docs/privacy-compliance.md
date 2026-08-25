# Privacy and GDPR operations checklist

The application provides technical privacy controls, but legal compliance also depends on the deployment owner’s organization, jurisdiction, providers, and processing purposes. Complete this checklist before production use.

## Technical controls included in the application

The application records versioned Terms and Privacy Policy acceptance, exposes consent renewal in Account Security, includes consent history in account exports, deletes consent and analytics records during account deletion, revokes pending task invitations when their task is deleted, and removes invitation records addressed to a deleted recipient email.

Voice transcripts, parsed intents, conversation context, and in-app notification messages are encrypted at rest with AES-256-GCM when `FIELD_ENCRYPTION_KEY` or the secure `JWT_SECRET` fallback is configured. Voice sessions, notifications, analytics events, and invitations have explicit expiration timestamps and MongoDB TTL indexes. Account exports decrypt protected voice data only for the authenticated owner and never export secret invitation token hashes.

## Deployment-owner responsibilities

1. Identify the data controller, privacy contact, processing purposes, legal basis, data-subject categories, and storage regions.
2. Publish the actual enabled subprocessors, including the database, AI/transcription provider, email provider, push provider, hosting platform, monitoring service, calendar provider, and SMS provider.
3. Sign appropriate data-processing agreements and review provider retention, training-use, residency, and deletion terms.
4. Configure `FIELD_ENCRYPTION_KEY` in a secret manager, restrict access, rotate it through a tested re-encryption migration, and protect database backups.
5. Set `VOICE_SESSION_RETENTION_DAYS`, `NOTIFICATION_RETENTION_DAYS`, and `ANALYTICS_RETENTION_DAYS` to documented values. Configure log and backup expiration separately because MongoDB TTL indexes do not erase provider backups or platform logs.
6. Operate an access, correction, restriction, portability, objection, and deletion request process. Account export and deletion endpoints are technical mechanisms, not a complete request-management process.
7. Maintain incident response, breach assessment and notification procedures, access reviews, vulnerability management, restore testing, and a record of processing activities.
8. Review invitation and notification recipients as personal-data disclosures. Delegation should be used only when the task owner has a lawful basis to contact the recipient.

Do not describe the product as legally compliant solely because these code controls are present. The deployed configuration and operating organization determine the final compliance position.
