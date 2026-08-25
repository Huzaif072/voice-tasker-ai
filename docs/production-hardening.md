# Production hardening and deployment responsibilities

This document separates controls implemented in the repository from controls that must be supplied by the hosting and database providers. The application does not provision cloud infrastructure, certificates, DNS, backups, or legal processes by itself.

## HTTPS and SSL

Deploy the Next.js service and the Socket.IO service behind a platform-managed HTTPS proxy. Use the platform-issued HTTPS URLs for `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SOCKET_URL`, `SOCKET_SERVER_URL`, and `SOCKET_CORS_ORIGINS`. Do not use plain HTTP in production.

The application sends HSTS in production with `includeSubDomains`. Enable certificate renewal, redirect HTTP to HTTPS at the edge, and verify both the web URL and Socket.IO health URL from outside the hosting network. The Socket.IO service must allow WebSocket upgrades through the proxy so browser connections use WSS.

## CDN and static assets

Next.js versioned assets under `/_next/static/` remain eligible for the framework and hosting CDN’s immutable asset policy. The service worker does not cache App Router HTML documents. A hosting CDN may cache these versioned assets at edge locations while the HTML and API routes remain revalidated through the application. Do not override framework-managed cache headers for versioned assets unless the chosen platform explicitly requires it.

Do not cache authenticated API responses, dashboard HTML, RSC payloads, invitation responses, account exports, notifications, or task responses publicly. The existing API no-store policy and private account-export policy must remain in place.

## Horizontal scaling

The Next.js web service is designed to remain stateless at the request layer. Use a platform that can run multiple web instances behind a load balancer. Keep MongoDB as the source of truth for tasks, reminders, assignments, analytics, and short-retention event records. Keep Redis available for distributed rate limiting and cache invalidation when more than one web instance is active.

Run the Socket.IO service as a separately managed process. One Socket.IO instance is sufficient for an initial deployment. If multiple Socket.IO instances are later required, add a shared Socket.IO adapter and configure sticky-session behavior or a compatible shared pub/sub transport before increasing the Socket.IO replica count. Do not rely on process-local room state across replicas.

## Required health checks

Configure the Next.js platform health check to use the application readiness endpoint and configure the Socket.IO platform health check to use `/healthz`. Monitor response status, restart the Socket.IO process automatically after failure, and alert when the Next.js provider-health response reports `socket: "unavailable"`.

## Database and backups

Enable MongoDB TLS and encryption at rest through the database provider. Enable automated backups, define a restore point objective, test a restore periodically, and document who can access backup data. MongoDB TTL deletion is asynchronous; backups and provider logs may retain records after application-level deletion unless the provider retention policy is configured accordingly.

Set a dedicated `FIELD_ENCRYPTION_KEY` with at least 32 random characters. Store it in the platform’s secret manager, do not commit it, and define a controlled key-rotation procedure. Rotating the key requires a migration plan because previously encrypted application fields must be re-encrypted before the old key is retired.

## Privacy and compliance operations

The application records legal-policy version acceptance, provides export and deletion endpoints, encrypts voice transcripts and notification messages at rest, applies configurable TTL retention to voice sessions, notifications, analytics, and invitations, and removes owned analytics and invitation data during account deletion.

The deployment owner must still publish the controller identity, legal basis, provider/subprocessor list, data-processing agreements, subject-request process, incident-response process, backup retention period, log retention period, and regional data-storage policy. These are operational and legal controls rather than code-only changes.
