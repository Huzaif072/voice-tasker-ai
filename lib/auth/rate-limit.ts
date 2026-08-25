import { createHash } from "node:crypto";
import { rateLimit } from "@/lib/redis/ratelimit";

const LOGIN_WINDOW_SECONDS = 10 * 60;
const LOGIN_EMAIL_LIMIT = 5;
const LOGIN_ADDRESS_LIMIT = 30;
const RESET_WINDOW_SECONDS = 15 * 60;
const RESET_EMAIL_LIMIT = 3;
const RESET_ADDRESS_LIMIT = 10;
const AI_DECOMPOSE_WINDOW_SECONDS = 60;
const AI_DECOMPOSE_LIMIT = 10;
const DELEGATION_WINDOW_SECONDS = 60;
const DELEGATION_LIMIT = 10;
const DELEGATION_TARGET_WINDOW_SECONDS = 60 * 60;
const DELEGATION_TARGET_LIMIT = 3;

function getClientAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function key(scope: string, value: string) {
  return `auth:${scope}:${digest(value)}`;
}

async function checkBuckets(
  buckets: Array<{ key: string; limit: number; windowSeconds: number }>
) {
  const results = await Promise.all(
    buckets.map(({ key: bucketKey, limit, windowSeconds }) =>
      rateLimit(bucketKey, limit, windowSeconds)
    )
  );
  return {
    success: results.every((result) => result.success),
    remaining: Math.min(...results.map((result) => result.remaining)),
  };
}

export function getRetryAfterSeconds(scope: "login" | "password-reset" | "ai-decompose" | "delegation") {
  if (scope === "login") return LOGIN_WINDOW_SECONDS;
  if (scope === "password-reset") return RESET_WINDOW_SECONDS;
  if (scope === "delegation") return DELEGATION_WINDOW_SECONDS;
  return AI_DECOMPOSE_WINDOW_SECONDS;
}

export async function checkAiDecomposeRateLimit(userId: string) {
  return rateLimit(`ai:decompose:${userId}`, AI_DECOMPOSE_LIMIT, AI_DECOMPOSE_WINDOW_SECONDS);
}

export async function checkDelegationRateLimit(userId: string, taskId: string, email: string) {
  return checkBuckets([
    {
      key: `delegation:user:${userId}`,
      limit: DELEGATION_LIMIT,
      windowSeconds: DELEGATION_WINDOW_SECONDS,
    },
    {
      key: `delegation:target:${userId}:${taskId}:${digest(email)}`,
      limit: DELEGATION_TARGET_LIMIT,
      windowSeconds: DELEGATION_TARGET_WINDOW_SECONDS,
    },
  ]);
}

export async function checkLoginRateLimit(request: Request, email: string) {
  const address = getClientAddress(request);
  return checkBuckets([
    {
      key: key("login-email", email),
      limit: LOGIN_EMAIL_LIMIT,
      windowSeconds: LOGIN_WINDOW_SECONDS,
    },
    {
      key: key("login-address", address),
      limit: LOGIN_ADDRESS_LIMIT,
      windowSeconds: LOGIN_WINDOW_SECONDS,
    },
  ]);
}

export async function checkPasswordResetRateLimit(request: Request, email: string) {
  const address = getClientAddress(request);
  return checkBuckets([
    {
      key: key("reset-email", email),
      limit: RESET_EMAIL_LIMIT,
      windowSeconds: RESET_WINDOW_SECONDS,
    },
    {
      key: key("reset-address", address),
      limit: RESET_ADDRESS_LIMIT,
      windowSeconds: RESET_WINDOW_SECONDS,
    },
  ]);
}
