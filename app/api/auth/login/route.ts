import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { loginSchema } from "@/lib/validators/auth";
import { signToken } from "@/lib/auth/jwt";
import { checkLoginRateLimit, getRetryAfterSeconds } from "@/lib/auth/rate-limit";
import { auditAuthEvent } from "@/lib/auth/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const loginLimit = await checkLoginRateLimit(request, email);
    if (!loginLimit.success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(getRetryAfterSeconds("login")) },
        }
      );
    }
    const db = await connectWithRetry();
    const users = await getUsersCollection(db);
    const user = await users.findOne({ email });

    if (!user?.password) {
      auditAuthEvent("login_failure", { reason: "invalid_credentials" });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      auditAuthEvent("login_failure", { userId: user._id?.toString(), reason: "invalid_password" });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    if (user.emailVerificationTokenHash) {
      auditAuthEvent("login_failure", { userId: user._id?.toString(), reason: "email_unverified" });
      return NextResponse.json(
        { error: "Please verify your email before signing in.", requiresEmailVerification: true },
        { status: 403 }
      );
    }

    const authUser = {
      id: user._id!.toString(),
      name: user.name,
      email: user.email,
      sessionVersion: user.sessionVersion ?? 0,
      emailVerifiedAt: user.emailVerifiedAt,
    };
    const token = signToken(authUser);
    auditAuthEvent("login_success", { userId: authUser.id, provider: "credentials" });

    const response = NextResponse.json({ user: authUser });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
