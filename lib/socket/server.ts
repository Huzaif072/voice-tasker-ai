// Socket.io server instance for real-time sync (Render deployment)
// Client connects via NEXT_PUBLIC_SOCKET_URL

type EmitCallback = (event: string, data: unknown) => void;
const userRooms = new Map<string, EmitCallback[]>();

export function registerUserEmitter(userId: string, emit: EmitCallback): () => void {
  const existing = userRooms.get(userId) ?? [];
  existing.push(emit);
  userRooms.set(userId, existing);
  return () => {
    const callbacks = userRooms.get(userId) ?? [];
    userRooms.set(
      userId,
      callbacks.filter((cb) => cb !== emit)
    );
  };
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  const callbacks = userRooms.get(userId) ?? [];
  callbacks.forEach((cb) => cb(event, data));
}

export const SOCKET_EVENTS = {
  TASK_CREATED: "task:created",
  TASK_UPDATED: "task:updated",
  TASK_DELETED: "task:deleted",
  NOTIFICATION: "notification:new",
} as const;
