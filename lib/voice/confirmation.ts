import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const TTL_SECONDS = 120;

function secret() {
  const value = process.env.JWT_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("JWT_SECRET or NEXTAUTH_SECRET is required for voice confirmations");
  return value;
}

export function createVoiceConfirmation(userId: string, action: string, taskId: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payload = `${userId}.${action}.${taskId}.${expiresAt}.${randomBytes(8).toString("hex")}`;
  const signature = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${signature}`;
}

export function verifyVoiceConfirmation(token: string, userId: string, action: string, taskId: string) {
  try {
    const [encodedPayload, providedSignature] = token.split(".");
    if (!encodedPayload || !providedSignature) return false;
    const payload = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const expectedSignature = createHmac("sha256", secret()).update(payload).digest("hex");
    const left = Buffer.from(expectedSignature, "utf8");
    const right = Buffer.from(providedSignature, "utf8");
    if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
    const [tokenUserId, tokenAction, tokenTaskId, expiresAt] = payload.split(".");
    return tokenUserId === userId && tokenAction === action && tokenTaskId === taskId && Number(expiresAt) >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
