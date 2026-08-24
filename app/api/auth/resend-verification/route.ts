import { NextResponse } from "next/server";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { sendEmailVerificationEmail } from "@/lib/notifications/email";
import { createOneTimeToken, getAppUrl } from "@/lib/auth/tokens";
import { checkPasswordResetRateLimit, getRetryAfterSeconds } from "@/lib/auth/rate-limit";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { getSafeReturnTo } from "@/lib/auth/redirect";

const GENERIC_MESSAGE = "If an account needs verification, a new verification email has been sent.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    const returnTo = getSafeReturnTo(typeof body.returnTo === "string" ? body.returnTo : null);
    if (!parsed.success) return NextResponse.json({ message: GENERIC_MESSAGE });

    const limit = await checkPasswordResetRateLimit(request, parsed.data.email);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(getRetryAfterSeconds("password-reset")) } }
      );
    }

    const db = await connectWithRetry();
    const users = await getUsersCollection(db);
    const user = await users.findOne({ email: parsed.data.email, password: { $exists: true } });
    if (!user || user.emailVerifiedAt) return NextResponse.json({ message: GENERIC_MESSAGE });

    const verification = createOneTimeToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await users.updateOne(
      { _id: user._id, password: { $exists: true } },
      {
        $set: {
          emailVerificationTokenHash: verification.hash,
          emailVerificationExpiresAt: expiresAt,
        },
      }
    );
    const sent = await sendEmailVerificationEmail(
      user.email,
      user.name,
      `${getAppUrl()}/api/auth/verify-email?token=${encodeURIComponent(verification.token)}&returnTo=${encodeURIComponent(returnTo)}`
    );
    if (!sent) console.warn("Verification email could not be sent");
    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("Resend-verification error:", error);
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }
}
