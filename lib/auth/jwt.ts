import jwt, { type SignOptions } from "jsonwebtoken";
import type { AuthUser } from "@/types/user";

const JWT_ISSUER = "voicetasker-ai";
const JWT_AUDIENCE = "voicetasker-ai-web";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters in production");
  }
  return secret ?? "dev-secret-change-in-production";
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  sv?: number;
}

export function signToken(user: AuthUser, expiresIn: SignOptions["expiresIn"] = "7d"): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      sv: user.sessionVersion ?? 0,
    },
    getJwtSecret(),
    {
      expiresIn,
      algorithm: "HS256",
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}
