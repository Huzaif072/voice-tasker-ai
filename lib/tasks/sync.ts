export type TaskSyncEvent = "created" | "updated" | "deleted";

export function broadcastTaskChange(event: TaskSyncEvent) {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel("voicetasker-task-changes");
  channel.postMessage({ event, at: Date.now() });
  channel.close();
}
