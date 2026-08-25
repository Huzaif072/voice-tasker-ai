# True Socket.IO Realtime

VoiceTasker uses a separate long-running Socket.IO service because the Next.js application and its API routes should remain deployable as stateless request handlers. The Socket.IO service joins each authenticated browser connection to a private `user:{userId}` room. Next.js mutation routes publish events to the service through a server-only authenticated HTTP endpoint.

## Local development

Use one terminal for Next.js and another for the Socket.IO process.

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run realtime:dev
```

Add these values to `.env.local`. Use the same random token in both processes, and never expose `SOCKET_INTERNAL_TOKEN` with a `NEXT_PUBLIC_` prefix.

```dotenv
JWT_SECRET=at-least-32-characters-and-the-same-in-both-processes
MONGODB_URI=mongodb://...
NEXT_PUBLIC_SOCKET_ENABLED=true
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
SOCKET_SERVER_URL=http://localhost:3001
SOCKET_INTERNAL_TOKEN=another-long-random-secret
SOCKET_CORS_ORIGINS=http://localhost:3000
```

Generate a token on macOS with:

```bash
openssl rand -hex 32
```

Verify the service before opening the dashboard:

```bash
curl -fsS http://localhost:3001/healthz
```

A successful response contains `"ok":true`. After signing in, the browser requests `/api/realtime/token` from the Next.js app. That endpoint performs the normal cookie-JWT and session-version checks, then returns a one-hour token scoped to realtime use. The Socket.IO service validates the token, checks the user’s current MongoDB session version and disabled status, and only then joins the user room.

## Production deployment

Deploy `realtime/server.ts` as a second always-on Node service using the same repository. Its build/install step is:

```bash
npm ci
```

Its start command is:

```bash
npm run realtime:start
```

Configure the platform to use its assigned `PORT`. The Socket.IO service requires the following server-side variables:

```dotenv
PORT=3001
JWT_SECRET=<exactly the same value used by the Next.js service>
MONGODB_URI=<the same database used by Next.js>
SOCKET_INTERNAL_TOKEN=<the same long random value used by Next.js>
SOCKET_CORS_ORIGINS=https://your-voice-tasker-domain.example
```

Configure the Next.js service with:

```dotenv
JWT_SECRET=<the same value used by the Socket.IO service>
MONGODB_URI=<the same database used by the Socket.IO service>
SOCKET_SERVER_URL=https://your-socket-service.example
SOCKET_INTERNAL_TOKEN=<the same long random value used by the Socket.IO service>
NEXT_PUBLIC_SOCKET_ENABLED=true
NEXT_PUBLIC_SOCKET_URL=https://your-socket-service.example
NEXT_PUBLIC_APP_URL=https://your-voice-tasker-domain.example
```

The browser-facing Socket.IO URL must use HTTPS in production. The server-to-server `SOCKET_SERVER_URL` must point to the same service and must be reachable from the Next.js runtime. The service health check is:

```bash
curl -fsS https://your-socket-service.example/healthz
```

The Next.js provider-health page reports `socket: "ok"` only when `SOCKET_SERVER_URL/healthz` responds successfully. It reports `disabled` when no server URL is configured and `unavailable` when the configured service cannot be reached.

## Event flow

Task creation, task updates, task deletion, delegation, assignment acceptance or decline, and notification-producing reminder work retain the MongoDB event-feed fallback and also publish Socket.IO events when `SOCKET_SERVER_URL` and `SOCKET_INTERNAL_TOKEN` are configured. The browser invalidates task and notification queries immediately when it receives the corresponding Socket.IO event. If the service is temporarily unavailable, the authenticated MongoDB event-feed fallback continues to synchronize the dashboard.

The `/publish` endpoint is not public. It accepts only a bearer token equal to `SOCKET_INTERNAL_TOKEN`, validates the event name against the shared protocol, and emits only to the requested user rooms. Browser clients cannot publish events.

## Operational requirements

The Socket.IO process must remain running continuously and must support WebSocket upgrades. Configure the hosting platform’s health check to use `/healthz`, allow inbound HTTPS/WSS traffic to the service, and use a process restart policy. Do not use the Next.js `/api/socket` route as the WebSocket server; that route remains a status boundary for the separately hosted process.

If the JWT secret, MongoDB connection string, session-version behavior, or internal publish token differs between services, the browser will receive a connection error or the Next.js mutation routes will fall back to the MongoDB event feed. The browser-facing URL and CORS origin must also match the actual deployed scheme and hostname.
