import { createHash, randomBytes } from "node:crypto";

export function createOneTimeToken() {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashOneTimeToken(token) };
}

export function hashOneTimeToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
