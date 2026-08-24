import { NextResponse } from "next/server";
import { handleAppleCallback } from "@/lib/auth/apple";
import { getSafeReturnTo } from "@/lib/auth/redirect";

function redirectToLogin(request: Request, error: string, returnTo = "/dashboard") {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", error);
  if (returnTo !== "/dashboard") loginUrl.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(loginUrl);
}

function getOAuthErrorCode(error: unknown) {
  const message = String(error);
  if (message.includes("email is not verified")) return "oauth_email_unverified";
  if (message.includes("identity does not match")) return "oauth_identity_conflict";
  return "oauth_failed";
}

async function completeAppleCallback(
  request: Request,
  values: { code: string | null; state: string | null; error: string | null; user: string | null }
) {
  const expectedState = request.headers.get("cookie")?.match(/(?:^|;\s*)apple_oauth_state=([^;]+)/)?.[1];
  const returnToCookie = request.headers.get("cookie")?.match(/(?:^|;\s*)apple_oauth_return_to=([^;]+)/)?.[1];
  const returnTo = getSafeReturnTo(returnToCookie ? decodeURIComponent(returnToCookie) : null);

  if (!values.state || !expectedState || values.state !== decodeURIComponent(expectedState)) {
    return redirectToLogin(request, "oauth_state_invalid", returnTo);
  }

  if (values.error || !values.code) {
    return redirectToLogin(request, "oauth_cancelled", returnTo);
  }

  let userPayload: { name?: { firstName?: string; lastName?: string }; email?: string } | undefined;
  if (values.user) {
    try {
      userPayload = JSON.parse(values.user);
    } catch {
      userPayload = undefined;
    }
  }

  try {
    const { token } = await handleAppleCallback(values.code, userPayload);
    const response = NextResponse.redirect(new URL(returnTo, request.url));
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    response.cookies.delete("apple_oauth_state");
    response.cookies.delete("apple_oauth_return_to");
    return response;
  } catch (error) {
    console.error("Apple OAuth callback error:", error);
    return redirectToLogin(request, getOAuthErrorCode(error), returnTo);
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  return completeAppleCallback(request, {
    code: typeof formData.get("code") === "string" ? formData.get("code") as string : null,
    state: typeof formData.get("state") === "string" ? formData.get("state") as string : null,
    error: typeof formData.get("error") === "string" ? formData.get("error") as string : null,
    user: typeof formData.get("user") === "string" ? formData.get("user") as string : null,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return completeAppleCallback(request, {
    code: searchParams.get("code"),
    state: searchParams.get("state"),
    error: searchParams.get("error"),
    user: searchParams.get("user"),
  });
}
