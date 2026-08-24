import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/privacy", "/terms"];
const authPaths = ["/login", "/signup", "/forgot-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  const isPublic = publicPaths.some((p) => pathname === p);
  const isAuthPage = authPaths.some((p) => pathname === p);
  const isDashboard = pathname.startsWith("/dashboard");
  const isApi = pathname.startsWith("/api");
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  const isAppleCallback = pathname === "/api/auth/apple/callback";

  if (isApi && isMutating && !isAppleCallback) {
    const source = request.headers.get("origin") ?? request.headers.get("referer");
    if (source) {
      try {
        const sourceOrigin = new URL(source).origin;
        const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
        const allowedOrigins = new Set([request.nextUrl.origin]);
        if (configuredOrigin) allowedOrigins.add(new URL(configuredOrigin).origin);
        if (!allowedOrigins.has(sourceOrigin)) {
          return NextResponse.json({ error: "Cross-site request rejected" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  if (isApi) return NextResponse.next();

  if (isDashboard && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublic && !isDashboard && !isAuthPage && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)"],
};
