import { NextResponse } from "next/server";
import { handleGoogleCallback } from "@/lib/auth/google";

function redirectToLogin(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/login?error=${error}`, request.url));
}

function getOAuthErrorCode(error: unknown) {
  const message = String(error);
  if (message.includes("email is not verified")) return "oauth_email_unverified";
  if (message.includes("identity does not match")) return "oauth_identity_conflict";
  return "oauth_failed";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");
  const expectedState = request.headers.get("cookie")?.match(/(?:^|;\s*)oauth_state=([^;]+)/)?.[1];

  if (!state || !expectedState || state !== decodeURIComponent(expectedState)) {
    return redirectToLogin(request, "oauth_state_invalid");
  }

  if (error || !code) {
    return redirectToLogin(request, "oauth_cancelled");
  }

  try {
    const { token } = await handleGoogleCallback(code);
    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    response.cookies.delete("oauth_state");
    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return redirectToLogin(request, getOAuthErrorCode(err));
  }
}
