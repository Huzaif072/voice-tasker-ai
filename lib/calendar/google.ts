import type { Collection } from "mongodb";
import type { UserDocument } from "@/lib/db/models/User";
import { encryptSecret, decryptSecret } from "@/lib/auth/secrets";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end?: string;
}

async function getAccessToken(user: UserDocument, users: Collection<UserDocument>) {
  if (!user.googleCalendarAccessToken) return null;
  const expiresAt = user.googleCalendarExpiresAt ? Date.parse(user.googleCalendarExpiresAt) : 0;
  if (expiresAt > Date.now() + 60_000) return decryptSecret(user.googleCalendarAccessToken);
  if (!user.googleCalendarRefreshToken || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null;

  const refreshToken = decryptSecret(user.googleCalendarRefreshToken);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const tokens = await response.json() as { access_token?: string; expires_in?: number };
  if (!tokens.access_token) return null;
  await users.updateOne(
    { _id: user._id },
    { $set: { googleCalendarAccessToken: encryptSecret(tokens.access_token), googleCalendarExpiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString() } },
  );
  return tokens.access_token;
}

export async function createCalendarEvent(user: UserDocument, users: Collection<UserDocument>, event: { summary: string; description?: string; start: string; end: string }) {
  if (process.env.GOOGLE_CALENDAR_ENABLED !== "true" || process.env.GOOGLE_CALENDAR_WRITE_ENABLED !== "true") return null;
  const accessToken = await getAccessToken(user, users);
  if (!accessToken) return null;
  const response = await fetch(GOOGLE_EVENTS_URL, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ summary: event.summary, description: event.description, start: { dateTime: event.start }, end: { dateTime: event.end } }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return null;
  const created = await response.json() as { id?: string; htmlLink?: string };
  return created.id ? { id: created.id, url: created.htmlLink } : null;
}

export async function getUpcomingCalendarEvents(user: UserDocument, users: Collection<UserDocument>, from = new Date(), hours = 24) {
  if (process.env.GOOGLE_CALENDAR_ENABLED !== "true") return [];
  const accessToken = await getAccessToken(user, users);
  if (!accessToken) return [];
  const timeMax = new Date(from.getTime() + hours * 60 * 60 * 1000);
  const params = new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });
  const response = await fetch(`${GOOGLE_EVENTS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return [];
  const payload = await response.json() as { items?: Array<{ id?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }> };
  return (payload.items ?? []).flatMap((event) => {
    const start = event.start?.dateTime ?? event.start?.date;
    if (!event.id || !start) return [];
    return [{ id: event.id, summary: event.summary ?? "Calendar event", start, end: event.end?.dateTime ?? event.end?.date }];
  });
}
