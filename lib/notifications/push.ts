export interface PushDeliveryResult {
  ok: boolean;
  permanentFailure: boolean;
  error?: string;
}

export function classifyPushFailure(error: unknown): PushDeliveryResult {
  const statusCode = (error as { statusCode?: number }).statusCode;
  return {
    ok: false,
    permanentFailure: statusCode === 404 || statusCode === 410,
    error: statusCode ? `Push provider returned HTTP ${statusCode}` : "Push provider rejected the notification",
  };
}

export async function sendPushNotificationResult(
  subscription: unknown,
  payload: { title: string; body: string; url?: string },
): Promise<PushDeliveryResult> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const mailto = process.env.VAPID_MAILTO;

  if (!publicKey || !privateKey || !mailto || !subscription) {
    return { ok: false, permanentFailure: false, error: "Push delivery is not configured" };
  }

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(`mailto:${mailto}`, publicKey, privateKey);
    await webpush.sendNotification(subscription as never, JSON.stringify(payload));
    return { ok: true, permanentFailure: false };
  } catch (error) {
    return classifyPushFailure(error);
  }
}

export async function sendPushNotification(
  subscription: unknown,
  payload: { title: string; body: string; url?: string },
): Promise<boolean> {
  const result = await sendPushNotificationResult(subscription, payload);
  return result.ok;
}
