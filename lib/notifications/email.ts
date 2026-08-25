import nodemailer from "nodemailer";

export interface EmailDeliveryResult {
  ok: boolean;
  permanentFailure: boolean;
  error?: string;
}

export function classifyEmailFailure(error: unknown): EmailDeliveryResult {
  const responseCode = (error as { responseCode?: number }).responseCode;
  const response = String((error as { response?: unknown }).response ?? "");
  const permanentFailure = [550, 551, 552, 553].includes(responseCode ?? 0) || /5\.1\.[12]/.test(response);
  return {
    ok: false,
    permanentFailure,
    error: permanentFailure ? "Email recipient was rejected" : "Email provider rejected the notification",
  };
}

export async function sendEmailResult(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailDeliveryResult> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM ?? user;

  if (!host || !user || !pass || !from) return { ok: false, permanentFailure: false, error: "Email delivery is not configured" };

  let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;
  try {
    const smtpPort = parseInt(port ?? "587", 10);
    transporter = nodemailer.createTransport({
      host,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("SMTP send timed out")), 12_000);
    });

    await Promise.race([
      transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
      timeout,
    ]);
    return { ok: true, permanentFailure: false };
  } catch (error) {
    return classifyEmailFailure(error);
  } finally {
    transporter?.close();
  }
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const result = await sendEmailResult(options);
  return result.ok;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '\"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendDelegationEmail(
  to: string,
  taskTitle: string,
  fromName: string,
  invitationUrl?: string,
): Promise<boolean> {
  const safeTitle = escapeHtml(taskTitle);
  const safeName = escapeHtml(fromName);
  const safeUrl = invitationUrl ? escapeHtml(invitationUrl) : undefined;
  return sendEmail({
    to,
    subject: `Task delegated: ${taskTitle}`,
    html: `<p>${safeName} delegated a task to you: <strong>${safeTitle}</strong></p>${safeUrl ? `<p><a href="${safeUrl}">Review and respond to this assignment</a></p><p>This invitation expires in seven days.</p>` : ""}`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);
  const year = new Date().getFullYear();

  return sendEmail({
    to,
    subject: "Reset your VoiceTasker AI password",
    html: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>Reset your VoiceTasker AI password</title>
        </head>
        <body style="margin:0;background:#0b1224;color:#e2e8f0;font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.5;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Securely reset your VoiceTasker AI password.</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b1224;">
            <tr>
              <td align="center" style="padding:40px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
                  <tr>
                    <td align="center" style="padding:0 0 24px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" valign="middle" style="width:42px;height:42px;border-radius:12px;background:#7c3aed;color:#ffffff;font-size:22px;font-weight:800;">V</td>
                          <td style="padding-left:10px;color:#f8fafc;font-size:20px;font-weight:700;letter-spacing:-0.3px;">VoiceTasker AI</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#111b33;border:1px solid #263452;border-radius:20px;padding:40px 36px;box-shadow:0 20px 60px rgba(2,6,23,0.35);">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" style="padding-bottom:24px;">
                            <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#2e1b63;color:#a78bfa;font-size:28px;line-height:56px;">&#128274;</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="color:#f8fafc;font-size:28px;font-weight:700;letter-spacing:-0.6px;text-align:center;">Reset your password</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 0 0;color:#94a3b8;font-size:16px;text-align:center;">Hi ${safeName}, we received a request to reset your VoiceTasker AI password.</td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:30px 0;">
                            <a href="${safeUrl}" style="display:inline-block;background:#7c3aed;border-radius:10px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 26px;box-shadow:0 8px 24px rgba(124,58,237,0.35);">Reset my password</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="border-top:1px solid #263452;padding-top:22px;color:#94a3b8;font-size:14px;">
                            <strong style="color:#cbd5e1;">This link expires in one hour.</strong><br />
                            If you did not request a password reset, you can safely ignore this email.
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top:22px;color:#64748b;font-size:12px;word-break:break-all;">
                            If the button does not work, copy and paste this link into your browser:<br />
                            <a href="${safeUrl}" style="color:#a78bfa;text-decoration:underline;">${safeUrl}</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:24px 16px 0;color:#64748b;font-size:12px;">
                      You received this email because a password reset was requested for your account.<br />
                      &copy; ${year} VoiceTasker AI. All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  dashboardUrl: string
): Promise<boolean> {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(dashboardUrl);
  const year = new Date().getFullYear();

  return sendEmail({
    to,
    subject: "Welcome to VoiceTasker AI",
    html: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>Welcome to VoiceTasker AI</title>
        </head>
        <body style="margin:0;background:#0b1224;color:#e2e8f0;font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.5;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your voice-first task workspace is ready.</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b1224;">
            <tr>
              <td align="center" style="padding:40px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
                  <tr>
                    <td align="center" style="padding:0 0 24px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" valign="middle" style="width:42px;height:42px;border-radius:12px;background:#7c3aed;color:#ffffff;font-size:22px;font-weight:800;">V</td>
                          <td style="padding-left:10px;color:#f8fafc;font-size:20px;font-weight:700;letter-spacing:-0.3px;">VoiceTasker AI</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#111b33;border:1px solid #263452;border-radius:20px;padding:40px 36px;box-shadow:0 20px 60px rgba(2,6,23,0.35);">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" style="padding-bottom:24px;">
                            <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:#2e1b63;color:#a78bfa;font-size:28px;line-height:56px;">&#10024;</div>
                          </td>
                        </tr>
                        <tr>
                          <td style="color:#f8fafc;font-size:28px;font-weight:700;letter-spacing:-0.6px;text-align:center;">Welcome aboard</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 0 0;color:#94a3b8;font-size:16px;text-align:center;">Hi ${safeName}, your voice-first task workspace is ready. Capture ideas, organize priorities, and keep moving without breaking your flow.</td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:30px 0 22px;">
                            <a href="${safeUrl}" style="display:inline-block;background:#7c3aed;border-radius:10px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 26px;box-shadow:0 8px 24px rgba(124,58,237,0.35);">Open my dashboard</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="border-top:1px solid #263452;padding-top:22px;color:#94a3b8;font-size:14px;">
                            Start with a simple command, such as “Remind me to call Alex tomorrow at 9 AM.” VoiceTasker AI will help turn it into an actionable task.
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top:22px;color:#64748b;font-size:12px;word-break:break-all;">
                            If the button does not work, copy and paste this link into your browser:<br />
                            <a href="${safeUrl}" style="color:#a78bfa;text-decoration:underline;">${safeUrl}</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:24px 16px 0;color:#64748b;font-size:12px;">
                      You received this email because a VoiceTasker AI account was created with this address.<br />
                      &copy; ${year} VoiceTasker AI. All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}

export async function sendEmailVerificationEmail(
  to: string,
  name: string,
  verificationUrl: string
): Promise<boolean> {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(verificationUrl);
  const year = new Date().getFullYear();

  return sendEmail({
    to,
    subject: "Verify your VoiceTasker AI email",
    html: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>Verify your VoiceTasker AI email</title>
        </head>
        <body style="margin:0;background:#0b1224;color:#e2e8f0;font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.5;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b1224;"><tr><td align="center" style="padding:40px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
              <tr><td align="center" style="padding:0 0 24px;color:#f8fafc;font-size:20px;font-weight:700;">VoiceTasker AI</td></tr>
              <tr><td style="background:#111b33;border:1px solid #263452;border-radius:20px;padding:40px 36px;">
                <h1 style="margin:0;color:#f8fafc;font-size:28px;text-align:center;">Verify your email</h1>
                <p style="color:#94a3b8;font-size:16px;text-align:center;">Hi ${safeName}, please verify your email to finish setting up your VoiceTasker AI account.</p>
                <p align="center" style="padding:18px 0;"><a href="${safeUrl}" style="display:inline-block;background:#7c3aed;border-radius:10px;color:#fff;font-size:16px;font-weight:700;text-decoration:none;padding:14px 26px;">Verify my email</a></p>
                <p style="border-top:1px solid #263452;padding-top:22px;color:#94a3b8;font-size:14px;">This link expires in 24 hours. If you did not create this account, you can safely ignore this email.</p>
                <p style="color:#64748b;font-size:12px;word-break:break-all;">If the button does not work, copy and paste this link:<br /><a href="${safeUrl}" style="color:#a78bfa;">${safeUrl}</a></p>
              </td></tr>
              <tr><td align="center" style="padding:24px 16px 0;color:#64748b;font-size:12px;">&copy; ${year} VoiceTasker AI. All rights reserved.</td></tr>
            </table>
          </td></tr></table>
        </body>
      </html>
    `,
  });
}

export async function sendPasswordChangedEmail(to: string, name: string): Promise<boolean> {
  const safeName = escapeHtml(name);
  const year = new Date().getFullYear();

  return sendEmail({
    to,
    subject: "Your VoiceTasker AI password was changed",
    html: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
          <title>Your VoiceTasker AI password was changed</title>
        </head>
        <body style="margin:0;background:#0b1224;color:#e2e8f0;font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.5;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0b1224;"><tr><td align="center" style="padding:40px 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
              <tr><td align="center" style="padding:0 0 24px;color:#f8fafc;font-size:20px;font-weight:700;">VoiceTasker AI</td></tr>
              <tr><td style="background:#111b33;border:1px solid #263452;border-radius:20px;padding:40px 36px;">
                <h1 style="margin:0;color:#f8fafc;font-size:28px;text-align:center;">Password changed</h1>
                <p style="color:#94a3b8;font-size:16px;text-align:center;">Hi ${safeName}, your VoiceTasker AI password was successfully changed.</p>
                <p style="border-top:1px solid #263452;padding-top:22px;color:#cbd5e1;font-size:15px;">If you made this change, no further action is needed. If you did not change your password, reset it immediately and review your account security.</p>
                <p style="color:#64748b;font-size:12px;">For your protection, all existing sessions have been signed out.</p>
              </td></tr>
              <tr><td align="center" style="padding:24px 16px 0;color:#64748b;font-size:12px;">&copy; ${year} VoiceTasker AI. All rights reserved.</td></tr>
            </table>
          </td></tr></table>
        </body>
      </html>
    `,
  });
}
