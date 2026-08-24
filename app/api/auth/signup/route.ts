import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection, defaultVoiceSettings } from "@/lib/db/models/User";
import { signupSchema } from "@/lib/validators/auth";
import { sendEmailVerificationEmail } from "@/lib/notifications/email";
import { createOneTimeToken, getAppUrl } from "@/lib/auth/tokens";
import { isDuplicateKeyError } from "@/lib/db/errors";
import { auditAuthEvent } from "@/lib/auth/audit";
import { getSafeReturnTo } from "@/lib/auth/redirect";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    const returnTo = getSafeReturnTo(typeof body.returnTo === "string" ? body.returnTo : null);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const name = parsed.data.name.trim();
    const { email, password } = parsed.data;
    const db = await connectWithRetry();
    const users = await getUsersCollection(db);

    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const now = new Date().toISOString();
    const verification = createOneTimeToken();
    const result = await users.insertOne({
      name,
      email,
      password: hashed,
      provider: "credentials",
      linkedProviders: [{ provider: "credentials", linkedAt: now }],
      voiceSettings: defaultVoiceSettings,
      createdAt: now,
      emailVerificationTokenHash: verification.hash,
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      sessionVersion: 0,
    });

    auditAuthEvent("signup", { userId: result.insertedId.toString(), provider: "credentials" });
    const user = { id: result.insertedId.toString(), name, email };
    const baseUrl = getAppUrl();
    const verificationSent = await sendEmailVerificationEmail(
      email,
      name,
      `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(verification.token)}&returnTo=${encodeURIComponent(returnTo)}`
    );
    if (!verificationSent) {
      console.warn("Verification email could not be sent; account remains pending verification");
    }

    const response = NextResponse.json({ user, requiresEmailVerification: true });
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Signup error:", err);
    if (isDuplicateKeyError(err)) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    if (String(err).includes("MONGODB_URI")) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
