import { NextResponse } from "next/server";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { getAppUrl, hashOneTimeToken } from "@/lib/auth/tokens";
import { sendWelcomeEmail } from "@/lib/notifications/email";
import { auditAuthEvent } from "@/lib/auth/audit";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length < 32) {
    return NextResponse.redirect(`${getAppUrl()}/verify-email?error=invalid`);
  }

  try {
    const db = await connectWithRetry();
    const users = await getUsersCollection(db);
    const now = new Date().toISOString();
    const result = await users.updateOne(
      {
        emailVerificationTokenHash: hashOneTimeToken(token),
        emailVerificationExpiresAt: { $gt: now },
        password: { $exists: true },
      },
      {
        $set: { emailVerifiedAt: now },
        $unset: { emailVerificationTokenHash: "", emailVerificationExpiresAt: "" },
        $inc: { sessionVersion: 1 },
      }
    );

    if (result.modifiedCount === 1) {
      const verifiedUser = await users.findOne({
        emailVerificationTokenHash: { $exists: false },
        emailVerifiedAt: now,
        password: { $exists: true },
      });
      if (verifiedUser) {
        auditAuthEvent("email_verified", { userId: verifiedUser._id?.toString() });
        const welcomeSent = await sendWelcomeEmail(
          verifiedUser.email,
          verifiedUser.name,
          `${getAppUrl()}/dashboard`
        );
        if (!welcomeSent) console.warn("Welcome email could not be sent after verification");
      }
    }

    return NextResponse.redirect(
      `${getAppUrl()}/login?verified=${result.modifiedCount === 1 ? "1" : "0"}`
    );
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(`${getAppUrl()}/verify-email?error=unavailable`);
  }
}
