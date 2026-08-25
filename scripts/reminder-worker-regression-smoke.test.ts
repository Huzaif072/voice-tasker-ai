import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { processDueReminders } from "../lib/reminders/processDueReminders";

const userId = "507f1f77bcf86cd799439011";
const taskId = new ObjectId("507f1f77bcf86cd799439012");

class FakeCollection {
  private readonly name: string;
  private readonly state: FakeState;

  constructor(name: string, state: FakeState) {
    this.name = name;
    this.state = state;
  }

  async createIndex() { return `${this.name}-index`; }

  find() {
    const rows = this.name === "tasks" ? this.state.tasks : this.name === "users" ? this.state.users : [];
    const cursor = {
      sort: () => cursor,
      limit: () => cursor,
      toArray: async () => rows,
    };
    return cursor;
  }

  async findOne() {
    return this.state.users[0] ?? null;
  }

  async insertOne(document: Record<string, unknown>) {
    if (this.state.notifications.some((item) => item.reminderKey === document.reminderKey)) {
      const error = Object.assign(new Error("duplicate"), { code: 11000 });
      throw error;
    }
    this.state.notifications.push(document);
    return { acknowledged: true };
  }

  async updateOne(filter: Record<string, unknown>, update: Record<string, Record<string, unknown>>, options?: { upsert?: boolean }) {
    if (this.name === "users") return { matchedCount: 1 };
    const reminderKey = filter.reminderKey as string | undefined;
    const channel = filter.channel as string | undefined;
    const filterId = filter._id as ObjectId | undefined;
    const filterStatus = filter.status as string | undefined;
    let row = this.state.deliveries.find((item) => (
      (!reminderKey || item.reminderKey === reminderKey) &&
      (!channel || item.channel === channel) &&
      (!filterId || item._id?.toString() === filterId.toString()) &&
      (!filterStatus || item.status === filterStatus)
    ));
    if (!row && options?.upsert) {
      row = { _id: new ObjectId(), ...(update.$setOnInsert ?? {}) };
      this.state.deliveries.push(row);
    }
    if (row && update.$set) Object.assign(row, update.$set);
    if (row && update.$inc) {
      for (const [key, value] of Object.entries(update.$inc)) row[key] = Number(row[key] ?? 0) + Number(value);
    }
    if (row && update.$unset) {
      for (const key of Object.keys(update.$unset)) delete row[key];
    }
    return { matchedCount: row ? 1 : 0, upsertedCount: row && options?.upsert ? 1 : 0 };
  }

  async findOneAndUpdate(filter: Record<string, unknown>, update: Record<string, Record<string, unknown>>) {
    const now = new Date(this.state.now).toISOString();
    const row = this.state.deliveries.find((item) => (
      Number(item.attempts) < 5 &&
      ((item.status === "pending" && String(item.nextAttemptAt) <= now) || (item.status === "sending" && String(item.leaseUntil) <= now))
    ));
    if (!row) return null;
    Object.assign(row, update.$set ?? {});
    for (const [key, value] of Object.entries(update.$inc ?? {})) row[key] = Number(row[key] ?? 0) + Number(value);
    return row;
  }

  async deleteMany() { return { deletedCount: 0 }; }
}

type FakeRow = {
  [key: string]: unknown;
  _id?: ObjectId;
  reminderKey?: string;
  channel?: string;
  status?: string;
  attempts?: number;
  nextAttemptAt?: string;
  leaseUntil?: string;
};
type FakeState = { now: string; tasks: FakeRow[]; users: FakeRow[]; notifications: FakeRow[]; deliveries: FakeRow[] };

function fakeDb(state: FakeState) {
  return { collection: (name: string) => new FakeCollection(name, state) } as unknown as import("mongodb").Db;
}

async function main() {
  const state: FakeState = {
    now: "2026-08-25T12:00:00.000Z",
    tasks: [{ _id: taskId, title: "Send reminder", createdBy: userId, reminderAt: "2026-08-25T11:00:00.000Z", status: "pending" }],
    users: [{ _id: new ObjectId(userId), email: "user@example.com", reminderSettings: { enabled: true, channels: ["in_app", "email"] } }],
    notifications: [],
    deliveries: [],
  };
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;

  const db = fakeDb(state);
  const first = await processDueReminders(db, new Date(state.now));
  assert.equal(first.created, 1);
  assert.equal(first.deliveriesClaimed, 1);
  assert.equal(first.deliveriesSent, 0);
  assert.equal(state.deliveries[0].status, "pending");
  assert.equal(state.deliveries[0].attempts, 1);

  const duplicate = await processDueReminders(db, new Date(state.now));
  assert.equal(duplicate.created, 0);
  assert.equal(state.notifications.length, 1);

  state.now = "2026-08-25T12:01:01.000Z";
  const retry = await processDueReminders(db, new Date(state.now));
  assert.equal(retry.deliveriesClaimed, 1);
  assert.equal(state.deliveries[0].attempts, 2);
  assert.equal(state.deliveries[0].status, "pending");
  console.log("PASS: reminder worker suppresses duplicate notifications and retries transient outbox failures with backoff.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
