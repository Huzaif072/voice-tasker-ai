const QUEUE_DB = "voicetasker-offline";
const QUEUE_STORE = "mutations";

function openQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function enqueueMutation(request) {
  const clone = request.clone();
  const body = request.method === "DELETE" ? null : await clone.text();
  const headers = {};
  clone.headers.forEach((value, key) => { headers[key] = value; });
  const db = await openQueue();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    transaction.objectStore(QUEUE_STORE).add({ url: request.url, method: request.method, headers, body, credentials: "include" });
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function readQueuedMutations() {
  const db = await openQueue();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readonly");
    const request = transaction.objectStore(QUEUE_STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeQueuedMutation(id) {
  const db = await openQueue();
  await new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    transaction.objectStore(QUEUE_STORE).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function flushQueuedMutations() {
  const queued = await readQueuedMutations();
  for (const mutation of queued) {
    try {
      const response = await fetch(mutation.url, { method: mutation.method, headers: mutation.headers, body: mutation.body, credentials: mutation.credentials });
      if (response.ok) await removeQueuedMutation(mutation.id);
    } catch {
      break;
    }
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim().then(flushQueuedMutations)));
self.addEventListener("message", (event) => {
  if (event.data?.type === "flush-offline-mutations") event.waitUntil(flushQueuedMutations());
});
self.addEventListener("sync", (event) => {
  if (event.tag === "voicetasker-task-mutations") event.waitUntil(flushQueuedMutations());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isTaskMutation = url.origin === self.location.origin && url.pathname.startsWith("/api/tasks") && ["POST", "PATCH", "DELETE"].includes(request.method);
  if (!isTaskMutation) return;
  event.respondWith(fetch(request).catch(async () => {
    await enqueueMutation(request);
    try { await self.registration.sync.register("voicetasker-task-mutations"); } catch { /* The online listener will retry when sync is unavailable. */ }
    return new Response(JSON.stringify({ queued: true, offline: true }), { status: 202, headers: { "Content-Type": "application/json" } });
  }));
});

self.addEventListener("push", (event) => {
  let payload = { title: "VoiceTasker AI", body: "You have a task reminder.", url: "/dashboard/notifications" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Use the safe default payload when a provider sends non-JSON data.
  }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: payload.url },
  }));
});

function safeNotificationUrl(rawUrl) {
  try {
    const url = new URL(rawUrl || "/dashboard/notifications", self.location.origin);
    if (url.origin !== self.location.origin) return "/dashboard/notifications";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard/notifications";
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = safeNotificationUrl(event.notification.data?.url);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(url);
        return existing.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
