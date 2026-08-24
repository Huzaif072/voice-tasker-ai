import { NextResponse } from "next/server";
import { getAppleAuthUrl, isAppleConfigured } from "@/lib/auth/apple";

export async function GET(request: Request) {
  if (!isAppleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=apple_not_configured", request.url));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getAppleAuthUrl(state));
  response.cookies.set("apple_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.APPLE_REDIRECT_URI?.startsWith("https://") === true,
    sameSite: "none",
    maxAge: 600,
    path: "/",
  });
  return response;
}
