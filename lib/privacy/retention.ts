const DEFAULT_NOTIFICATION_RETENTION_DAYS = 90;
const DEFAULT_VOICE_RETENTION_DAYS = 90;
const DEFAULT_ANALYTICS_RETENTION_DAYS = 730;

function retentionDate(envName: string, fallbackDays: number) {
  const configured = Number(process.env[envName] ?? fallbackDays);
  const days = Number.isFinite(configured) ? Math.max(7, Math.floor(configured)) : fallbackDays;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function notificationExpiresAt() {
  return retentionDate("NOTIFICATION_RETENTION_DAYS", DEFAULT_NOTIFICATION_RETENTION_DAYS);
}

export function voiceSessionExpiresAt() {
  return retentionDate("VOICE_SESSION_RETENTION_DAYS", DEFAULT_VOICE_RETENTION_DAYS);
}

export function analyticsExpiresAt() {
  return retentionDate("ANALYTICS_RETENTION_DAYS", DEFAULT_ANALYTICS_RETENTION_DAYS);
}
