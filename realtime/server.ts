import { createServer } from "node:http";
import { Server } from "socket.io";
import { ObjectId } from "mongodb";
import { verifyRealtimeToken } from "../lib/auth/jwt";
import { connectWithRetry } from "../lib/db/mongodb";
import { getUsersCollection } from "../lib/db/models/User";
import { SOCKET_EVENTS } from "../lib/socket/server";

const port = Number(process.env.PORT ?? process.env.SOCKET_PORT ?? 3001);
const internalToken = process.env.SOCKET_INTERNAL_TOKEN?.trim();
const allowedOrigins = new Set(
  (process.env.SOCKET_CORS_ORIGINS ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const eventNames = new Set<string>(Object.values(SOCKET_EVENTS));

type PublishBody = {
  userIds?: unknown;
  event?: unknown;
  data?: unknown;
};

function json(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function isAllowedOrigin(origin: string | undefined) {
  return !origin || allowedOrigins.has("*") || allowedOrigins.has(origin);
}

const httpServer = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/healthz") {
    json(response, 200, { ok: true, service: "voicetasker-socket", timestamp: new Date().toISOString() });
    return;
  }
  if (request.method !== "POST" || request.url !== "/publish") {
    json(response, 404, { error: "Not found" });
    return;
  }
  if (!internalToken || request.headers.authorization !== `Bearer ${internalToken}`) {
    json(response, 401, { error: "Unauthorized" });
    return;
  }
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as PublishBody;
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter((value): value is string => typeof value === "string" && value.length > 0) : [];
    if (!userIds.length || typeof body.event !== "string" || !eventNames.has(body.event)) {
      json(response, 400, { error: "userIds and a supported event are required" });
      return;
    }
    for (const userId of userIds) io.to(`user:${userId}`).emit(body.event, body.data ?? {});
    json(response, 202, { published: userIds.length });
  } catch {
    json(response, 400, { error: "Invalid publish request" });
  }
});

const io = new Server(httpServer, {
  transports: ["websocket", "polling"],
  cors: {
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin) ? origin ?? true : false),
    methods: ["GET", "POST"],
  },
  pingInterval: 25_000,
  pingTimeout: 20_000,
});

io.use(async (socket, next) => {
  const token = typeof socket.handshake.auth?.token === "string" ? socket.handshake.auth.token : "";
  const payload = verifyRealtimeToken(token);
  if (!payload?.sub || !ObjectId.isValid(payload.sub)) {
    next(new Error("Invalid realtime token"));
    return;
  }
  try {
    const db = await connectWithRetry(1);
    const user = await getUsersCollection(db).then((users) => users.findOne({ _id: new ObjectId(payload.sub) }, { projection: { disabledAt: 1, sessionVersion: 1 } }));
    if (!user || user.disabledAt || (user.sessionVersion ?? 0) !== (payload.sv ?? 0)) {
      next(new Error("Realtime session is no longer valid"));
      return;
    }
    socket.data.userId = payload.sub;
    next();
  } catch {
    next(new Error("Realtime authentication unavailable"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string;
  socket.join(`user:${userId}`);
  socket.emit("realtime:ready", { userId });
});

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`VoiceTasker Socket.IO server listening on ${port}`);
});
