import jwt from "jsonwebtoken";
import { signupSchema } from "../lib/validators/auth.ts";
import { rateLimit } from "../lib/redis/ratelimit.ts";
import { voiceInputSchema } from "../lib/validators/voice.ts";
import { isSessionVersionCurrent } from "../lib/auth/session.ts";
import { getSafeReturnTo } from "../lib/auth/redirect.ts";

async function main() {
if (!isSessionVersionCurrent(undefined, 4) || !isSessionVersionCurrent(0, undefined) || isSessionVersionCurrent(3, 2)) {
  throw new Error("Expected session-version revocation checks to distinguish current and stale sessions");
}
if (voiceInputSchema.safeParse({}).success) throw new Error("Expected empty voice input to be rejected");
if (voiceInputSchema.safeParse({ text: "delete the draft" }).success !== true) throw new Error("Expected text voice input to be accepted");
if (voiceInputSchema.safeParse({ audio: "a", mimeType: "audio/webm;codecs=opus" }).success !== true) throw new Error("Expected codec-qualified webm input to be accepted");
if (voiceInputSchema.safeParse({ text: "a", audio: "b" }).success) throw new Error("Expected mixed text/audio input to be rejected");
if (voiceInputSchema.safeParse({}).success) throw new Error("Expected empty voice input to be rejected");
if (!voiceInputSchema.safeParse({ text: "delete the draft" }).success) throw new Error("Expected text voice input to be accepted");
if (voiceInputSchema.safeParse({ audio: "a".repeat(12_000_001), mimeType: "audio/webm" }).success) throw new Error("Expected oversized audio input to be rejected");
if (getSafeReturnTo("/dashboard/tasks?filter=urgent") !== "/dashboard/tasks?filter=urgent") {
  throw new Error("Expected an internal return path to be preserved");
}
if (getSafeReturnTo("https://example.com") !== "/dashboard" || getSafeReturnTo("//example.com") !== "/dashboard" || getSafeReturnTo("/\\example.com") !== "/dashboard") {
  throw new Error("Expected unsafe return paths to fall back to the dashboard");
}
const invalidName = signupSchema.safeParse({
  name: "  a ",
  email: "USER@EXAMPLE.COM",
  password: "Password1",
});
if (invalidName.success) {
  throw new Error("Expected trimmed minimum-length name validation to reject a one-character name");
}

const normalized = signupSchema.safeParse({
  name: "  Ada Lovelace  ",
  email: " USER@EXAMPLE.COM ",
  password: "Password1",
});
if (!normalized.success || normalized.data.name !== "Ada Lovelace" || normalized.data.email !== "user@example.com") {
  throw new Error("Expected signup input to trim the name and normalize the email");
}

process.env.NODE_ENV = "production";
process.env.JWT_SECRET = "a".repeat(32);
const { signToken, verifyToken } = await import("../lib/auth/jwt.ts");
const token = signToken({ id: "507f1f77bcf86cd799439011", name: "Ada", email: "user@example.com" });
if (!verifyToken(token)) {
  throw new Error("Expected a correctly issued JWT to verify");
}

const wrongClaimsToken = jwt.sign(
  { sub: "507f1f77bcf86cd799439011", name: "Ada", email: "user@example.com" },
  process.env.JWT_SECRET,
  { algorithm: "HS256", issuer: "wrong-issuer", audience: "wrong-audience" }
);
if (verifyToken(wrongClaimsToken)) {
  throw new Error("Expected a JWT with incorrect issuer/audience to be rejected");
}

delete process.env.JWT_SECRET;
let missingSecretRejected = false;
try {
  signToken({ id: "507f1f77bcf86cd799439011", name: "Ada", email: "user@example.com" });
} catch {
  missingSecretRejected = true;
}
if (!missingSecretRejected) {
  throw new Error("Expected production JWT signing without a sufficiently long secret to fail");
}

delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
const fallback = await rateLimit("auth-smoke", 3, 60);
if (!fallback.success || fallback.remaining !== 3) {
  throw new Error("Expected Redis-disabled rate limiting to fail safely open");
}

console.log("PASS: auth normalization, JWT claim enforcement, production secret safety, and Redis fallback.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
