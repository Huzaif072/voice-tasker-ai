import { NextResponse } from "next/server";
import { handleGoogleCallback } from "@/lib/auth/google";
import { getSafeReturnTo } from "@/lib/auth/redirect";

function redirectToLogin(request: Request, error: string, returnTo = "/dashboard") {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", error);
  if (returnTo !== "/dashboard") loginUrl.searchParams.set("returnTo", returnTo);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete("oauth_state");
  response.cookies.delete("google_oauth_return_to");
  return response;
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
  const returnToCookie = request.headers.get("cookie")?.match(/(?:^|;\s*)google_oauth_return_to=([^;]+)/)?.[1];
  const returnTo = getSafeReturnTo(returnToCookie ? decodeURIComponent(returnToCookie) : null);

  if (!state || !expectedState || state !== decodeURIComponent(expectedState)) {
    return redirectToLogin(request, "oauth_state_invalid", returnTo);
  }

  if (error || !code) {
    return redirectToLogin(request, "oauth_cancelled", returnTo);
  }

  try {
    const { token } = await handleGoogleCallback(code);
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    response.cookies.delete("oauth_state");
    response.cookies.delete("google_oauth_return_to");
    return response;
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return redirectToLogin(request, getOAuthErrorCode(err), returnTo);
  }
}
