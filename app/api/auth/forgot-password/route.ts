import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { sendPasswordResetEmail } from "@/lib/notifications/email";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { checkPasswordResetRateLimit, getRetryAfterSeconds } from "@/lib/auth/rate-limit";

const GENERIC_MESSAGE = "If an account exists, a reset link has been sent.";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid email address" }, { status: 400 });
    }

    const resetLimit = await checkPasswordResetRateLimit(request, parsed.data.email);
    if (!resetLimit.success) {
      return NextResponse.json(
        { error: "Too many password-reset requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(getRetryAfterSeconds("password-reset")) },
        }
      );
    }

    const db = await connectWithRetry();
    const users = await getUsersCollection(db);
    const user = await users.findOne({ email: parsed.data.email });

    if (!user?.password) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetTokenHash: hashToken(token),
          passwordResetExpiresAt: expiresAt,
        },
      }
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    const sent = await sendPasswordResetEmail(user.email, user.name, resetUrl);

    if (!sent) {
      await users.updateOne(
        { _id: user._id },
        { $unset: { passwordResetTokenHash: "", passwordResetExpiresAt: "" } }
      );
      console.error("Password reset email could not be sent");
      return NextResponse.json(
        { error: "Email delivery is not configured or is temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Forgot-password request error:", error);
    return NextResponse.json({ error: "Unable to process the request" }, { status: 500 });
  }
}
