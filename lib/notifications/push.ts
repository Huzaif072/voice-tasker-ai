export async function sendPushNotification(
  subscription: unknown,
  payload: { title: string; body: string; url?: string }
): Promise<boolean> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const mailto = process.env.VAPID_MAILTO;

  if (!publicKey || !privateKey || !mailto || !subscription) {
    return false;
  }

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(`mailto:${mailto}`, publicKey, privateKey);
    await webpush.sendNotification(subscription as never, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}
