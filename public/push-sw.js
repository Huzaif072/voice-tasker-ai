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
