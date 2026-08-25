export interface SmsDeliveryResult {
  sent: boolean;
  configured: boolean;
  permanent: boolean;
}

export async function sendSms(to: string, body: string): Promise<SmsDeliveryResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!accountSid || !authToken || !from) return { sent: false, configured: false, permanent: false };

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { sent: true, configured: true, permanent: false };
    const status = response.status;
    return { sent: false, configured: true, permanent: status >= 400 && status < 500 };
  } catch {
    return { sent: false, configured: true, permanent: false };
  }
}
