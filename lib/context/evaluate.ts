import { ObjectId } from "mongodb";
import type { Db } from "mongodb";
import { getTasksCollection } from "@/lib/db/models/Task";
import { getNotificationsCollection } from "@/lib/db/models/Notification";
import { getUsersCollection } from "@/lib/db/models/User";
import { getUpcomingCalendarEvents } from "@/lib/calendar/google";
import type { ContextTrigger } from "@/types/task";
import { decryptTaskDocument, encryptedTaskUpdate } from "@/lib/privacy/taskEncryption";
import { encryptUserText } from "@/lib/privacy/fieldEncryption";

interface Position { latitude: number; longitude: number }
interface Weather { temperature?: number; precipitation?: number; rain?: number; weatherCode?: number }

const MIN_TRIGGER_INTERVAL_MS = 30 * 60 * 1000;
const RECURRENCE_INTERVAL_MS = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
} as const;

type WeatherLocation = { latitude: number; longitude: number };

function distanceMeters(a: Position, b: Position) {
  const earthRadius = 6_371_000;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function weatherLocationKey(location: WeatherLocation) {
  return `${location.latitude},${location.longitude}`;
}

async function fetchWeather(latitude: number, longitude: number): Promise<Weather | null> {
  try {
    const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), current: "temperature_2m,precipitation,rain,weather_code" });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const payload = await response.json() as { current?: { temperature_2m?: number; precipitation?: number; rain?: number; weather_code?: number } };
    return payload.current ? { temperature: payload.current.temperature_2m, precipitation: payload.current.precipitation, rain: payload.current.rain, weatherCode: payload.current.weather_code } : null;
  } catch {
    return null;
  }
}

function weatherMatches(trigger: ContextTrigger, weather: Weather | null) {
  if (!weather) return false;
  const condition = `${trigger.condition ?? trigger.value}`.toLowerCase();
  if (condition.includes("rain")) return (weather.rain ?? 0) > 0 || (weather.precipitation ?? 0) > 0;
  if (condition.includes("snow")) return (weather.weatherCode ?? 0) >= 70 && (weather.weatherCode ?? 0) < 80;
  if (condition.includes("clear")) return [0, 1].includes(weather.weatherCode ?? -1);
  const temperature = condition.match(/(?:below|under|<)\s*(-?\d+(?:\.\d+)?)/);
  if (temperature) return (weather.temperature ?? Number.POSITIVE_INFINITY) < Number(temperature[1]);
  return false;
}

function recurrenceInterval(trigger: ContextTrigger) {
  return trigger.type === "time" && trigger.recurrence ? RECURRENCE_INTERVAL_MS[trigger.recurrence] : undefined;
}

function triggerCanRun(trigger: ContextTrigger, now: Date) {
  if (!trigger.lastTriggeredAt) return true;
  const lastTriggered = Date.parse(trigger.lastTriggeredAt);
  if (!Number.isFinite(lastTriggered)) return true;
  if (trigger.type === "time" && !trigger.recurrence) return false;
  const interval = recurrenceInterval(trigger) ?? MIN_TRIGGER_INTERVAL_MS;
  return now.getTime() - lastTriggered >= interval;
}

function triggerMatches(trigger: ContextTrigger, now: Date, position: Position | undefined, weather: Weather | null, events: Array<{ summary: string }>) {
  if (trigger.type === "time") {
    const timestamp = Date.parse(trigger.value);
    return Number.isFinite(timestamp) && now.getTime() >= timestamp;
  }
  if (trigger.type === "location") {
    if (!position || trigger.latitude === undefined || trigger.longitude === undefined) return false;
    return distanceMeters(position, { latitude: trigger.latitude, longitude: trigger.longitude }) <= (trigger.radiusMeters ?? 250);
  }
  if (trigger.type === "weather") return weatherMatches(trigger, weather);
  if (trigger.type === "calendar" || trigger.type === "keyword") {
    const needle = trigger.value.toLowerCase();
    return events.some((event) => event.summary.toLowerCase().includes(needle));
  }
  return false;
}

async function getWeatherByLocation(activeTasks: Array<{ contextTriggers?: ContextTrigger[] }>) {
  const locations = new Map<string, WeatherLocation>();
  for (const task of activeTasks) {
    for (const trigger of task.contextTriggers ?? []) {
      if (trigger.type !== "weather" || trigger.latitude === undefined || trigger.longitude === undefined) continue;
      const location = { latitude: trigger.latitude, longitude: trigger.longitude };
      locations.set(weatherLocationKey(location), location);
    }
  }

  const entries: Array<readonly [string, Weather | null]> = [];
  const locationsList = [...locations.values()];
  for (let index = 0; index < locationsList.length; index += 6) {
    const batch = locationsList.slice(index, index + 6);
    entries.push(...await Promise.all(batch.map(async (location) => [weatherLocationKey(location), await fetchWeather(location.latitude, location.longitude)] as const)));
  }
  return new Map(entries);
}

export async function evaluateContextTriggers(db: Db, userId: string, position?: Position) {
  const tasks = await getTasksCollection(db);
  const notifications = await getNotificationsCollection(db);
  const users = await getUsersCollection(db);
  const user = ObjectId.isValid(userId) ? await users.findOne({ _id: new ObjectId(userId) }).catch(() => null) : null;
  const activeTasks = (await tasks.find({ createdBy: userId, status: { $nin: ["completed", "cancelled"] } }).toArray()).map(decryptTaskDocument).filter((task) => Array.isArray(task.contextTriggers) && task.contextTriggers.length > 0);
  const weatherByLocation = await getWeatherByLocation(activeTasks);
  const calendarEvents = user ? await getUpcomingCalendarEvents(user, users).catch(() => []) : [];
  const now = new Date();
  let matched = 0;

  for (const task of activeTasks) {
    const triggers = (task.contextTriggers ?? []) as ContextTrigger[];
    let changed = false;
    const nextTriggers: ContextTrigger[] = [];
    for (const trigger of triggers) {
      if (!triggerCanRun(trigger, now)) {
        nextTriggers.push(trigger);
        continue;
      }
      const weather = trigger.type === "weather" && trigger.latitude !== undefined && trigger.longitude !== undefined
        ? weatherByLocation.get(weatherLocationKey({ latitude: trigger.latitude, longitude: trigger.longitude })) ?? null
        : null;
      if (!triggerMatches(trigger, now, position, weather, calendarEvents)) {
        nextTriggers.push(trigger);
        continue;
      }
      changed = true;
      matched += 1;
      const interval = recurrenceInterval(trigger);
      const occurrence = interval ? Math.floor(now.getTime() / interval) : now.toISOString().slice(0, 13);
      const reminderKey = `context:${task._id?.toString()}:${trigger.type}:${trigger.value}:${occurrence}`;
      await notifications.updateOne(
        { userId, reminderKey },
        { $setOnInsert: { userId, type: "context_trigger", title: "Context reminder", message: encryptUserText(`Context matched for task: ${task.title}`), read: false, taskId: task._id?.toString(), reminderKey, createdAt: now.toISOString() } },
        { upsert: true },
      );
      nextTriggers.push({ ...trigger, lastTriggeredAt: now.toISOString() });
    }
    if (changed) {
      const encryptedUpdate = encryptedTaskUpdate(task, { contextTriggers: nextTriggers });
      await tasks.updateOne({ _id: task._id, createdBy: userId }, { $set: { ...encryptedUpdate.$set, updatedAt: now.toISOString() }, $unset: encryptedUpdate.$unset });
    }
  }
  return { evaluated: activeTasks.length, matched };
}
