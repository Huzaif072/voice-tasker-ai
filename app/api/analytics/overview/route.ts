import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getAnalyticsCollection } from "@/lib/analytics/events";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const db = await connectWithRetry();
    const collection = await getAnalyticsCollection(db);
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const match = { userId: auth.user.id, createdAt: { $gte: since.toISOString() } };
    const [rows, activeDays, voiceConfidence, feedback, activeWeeks] = await Promise.all([
      collection.aggregate<{ _id: string; count: number }>([{ $match: match }, { $group: { _id: "$name", count: { $sum: 1 } } }]).toArray(),
      collection.aggregate<{ _id?: null; days: number }>([{ $match: match }, { $project: { day: { $substrBytes: ["$createdAt", 0, 10] } } }, { $group: { _id: "$day" } }, { $count: "days" }]).toArray(),
      collection.aggregate<{ _id: null; average: number }>([{ $match: { ...match, name: "voice_session" } }, { $group: { _id: null, average: { $avg: "$properties.confidence" } } }]).toArray(),
      collection.aggregate<{ _id: { category: string; rating: string }; count: number }>([{ $match: { ...match, name: "feedback_submitted" } }, { $group: { _id: { category: "$properties.category", rating: "$properties.rating" }, count: { $sum: 1 } } }]).toArray(),
      collection.aggregate<{ _id: string }>([{ $match: match }, { $project: { week: { $substrBytes: ["$createdAt", 0, 7] } } }, { $group: { _id: "$week" } }]).toArray(),
    ]);
    const metrics = Object.fromEntries(rows.map((row) => [row._id, row.count]));
    const feedbackMetrics = Object.fromEntries(feedback.map((row) => [`${row._id.category}_${row._id.rating}`, row.count]));
    const createdTasks = metrics.task_created ?? 0;
    const completedTasks = metrics.task_completed ?? 0;
    const positiveFeedback = feedback.filter((row) => row._id.rating === "positive").reduce((total, row) => total + row.count, 0);
    const negativeFeedback = feedback.filter((row) => row._id.rating === "negative").reduce((total, row) => total + row.count, 0);
    const feedbackTotal = positiveFeedback + negativeFeedback;
    return NextResponse.json({
      periodDays: 30,
      metrics,
      activeDays: activeDays[0]?.days ?? 0,
      weeksWithActivity: activeWeeks.length,
      weeklyRetentionRate: Math.min(1, activeWeeks.length / 4),
      taskCompletionRate: createdTasks ? completedTasks / createdTasks : null,
      activeVoiceSessions: metrics.voice_session ?? 0,
      dailyAgendaRequests: metrics.summary_requested ?? 0,
      averageVoiceConfidence: voiceConfidence[0]?.average ?? null,
      satisfactionScore: feedbackTotal ? positiveFeedback / feedbackTotal : null,
      feedback: feedbackMetrics,
    });
  } catch {
    return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 });
  }
}
