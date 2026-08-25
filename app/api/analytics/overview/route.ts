import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getAnalyticsCollection } from "@/lib/analytics/events";

function weekStart(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function addWeeks(value: string, weeks: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const db = await connectWithRetry();
    const collection = await getAnalyticsCollection(db);
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const cohortSince = new Date();
    cohortSince.setDate(cohortSince.getDate() - 90);
    const match = { userId: auth.user.id, createdAt: { $gte: since.toISOString() } };
    const [rows, activeDays, voiceConfidence, feedback, currentActivity, cohortActivity] = await Promise.all([
      collection.aggregate<{ _id: string; count: number }>([{ $match: match }, { $group: { _id: "$name", count: { $sum: 1 } } }]).toArray(),
      collection.aggregate<{ _id?: null; days: number }>([{ $match: match }, { $project: { day: { $substrBytes: ["$createdAt", 0, 10] } } }, { $group: { _id: "$day" } }, { $count: "days" }]).toArray(),
      collection.aggregate<{ _id: null; average: number }>([{ $match: { ...match, name: "voice_session" } }, { $group: { _id: null, average: { $avg: "$properties.confidence" } } }]).toArray(),
      collection.aggregate<{ _id: { category: string; rating: string }; count: number }>([{ $match: { ...match, name: "feedback_submitted" } }, { $group: { _id: { category: "$properties.category", rating: "$properties.rating" }, count: { $sum: 1 } } }]).toArray(),
      collection.find({ ...match, name: "app_active" }).project({ createdAt: 1 }).toArray(),
      collection.find({ name: "app_active", createdAt: { $gte: cohortSince.toISOString() } }).project({ userId: 1, createdAt: 1 }).toArray(),
    ]);

    const metrics = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const feedbackMetrics = Object.fromEntries(feedback.map((row) => [`${row._id.category}_${row._id.rating}`, row.count]));
    const createdTasks = metrics.task_created ?? 0;
    const completedTasks = metrics.task_completed ?? 0;
    const positiveFeedback = feedback.filter((row) => row._id.rating === "positive").reduce((total, row) => total + row.count, 0);
    const negativeFeedback = feedback.filter((row) => row._id.rating === "negative").reduce((total, row) => total + row.count, 0);
    const feedbackTotal = positiveFeedback + negativeFeedback;
    const userWeeks = new Set(currentActivity.map((event) => weekStart(event.createdAt)).filter((value): value is string => Boolean(value)));

    const userWeekMap = new Map<string, Set<string>>();
    for (const event of cohortActivity) {
      const start = weekStart(event.createdAt);
      if (!start) continue;
      const weeks = userWeekMap.get(event.userId) ?? new Set<string>();
      weeks.add(start);
      userWeekMap.set(event.userId, weeks);
    }
    const cohorts = new Map<string, Set<string>>();
    for (const [userId, weeks] of userWeekMap) {
      const firstWeek = [...weeks].sort()[0];
      if (!firstWeek) continue;
      const users = cohorts.get(firstWeek) ?? new Set<string>();
      users.add(userId);
      cohorts.set(firstWeek, users);
    }
    const retentionCohorts = [...cohorts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([cohortStart, users]) => {
      const retainedUsers = [...users].map((userId) => userWeekMap.get(userId) ?? new Set<string>());
      const weeks = Array.from({ length: 4 }, (_, offset) => {
        const target = addWeeks(cohortStart, offset);
        const retained = retainedUsers.filter((activityWeeks) => activityWeeks.has(target)).length;
        return { week: offset, activeUsers: retained, rate: users.size ? retained / users.size : 0 };
      });
      return { cohortStart, cohortSize: users.size, weeks };
    });
    const cohortUsers = [...userWeekMap.keys()].length;
    const retainedWeekFourUsers = retentionCohorts.reduce((total, cohort) => total + (cohort.weeks[3]?.activeUsers ?? 0), 0);

    return NextResponse.json({
      periodDays: 30,
      metrics,
      activeDays: activeDays[0]?.days ?? 0,
      weeksWithActivity: userWeeks.size,
      weeklyRetentionRate: userWeeks.size ? Math.min(1, userWeeks.size / 4) : null,
      taskCompletionRate: createdTasks ? completedTasks / createdTasks : null,
      activeVoiceSessions: metrics.voice_session ?? 0,
      dailyAgendaRequests: metrics.summary_requested ?? 0,
      averageVoiceConfidence: voiceConfidence[0]?.average ?? null,
      satisfactionScore: feedbackTotal ? positiveFeedback / feedbackTotal : null,
      feedback: feedbackMetrics,
      retention: { windowDays: 90, cohortCount: retentionCohorts.length, activeUsers: cohortUsers, weekFourRetainedUsers: retainedWeekFourUsers, cohorts: retentionCohorts },
    });
  } catch {
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 });
  }
}
