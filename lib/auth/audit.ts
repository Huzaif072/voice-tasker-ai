type AuthAuditEvent =
  | "signup"
  | "login_success"
  | "login_failure"
  | "email_verified"
  | "password_reset"
  | "session_revoked"
  | "provider_unlinked";

export function auditAuthEvent(event: AuthAuditEvent, details: Record<string, string | number | boolean | undefined> = {}) {
  const safeDetails = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== undefined)
  );
  console.info(JSON.stringify({
    scope: "auth",
    event,
    at: new Date().toISOString(),
    ...safeDetails,
  }));
}
