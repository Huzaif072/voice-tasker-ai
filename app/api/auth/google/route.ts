import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/auth/google";

export async function GET(request: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(getGoogleAuthUrl(state));
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
