import { NextResponse } from "next/server";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { getAppUrl, hashOneTimeToken } from "@/lib/auth/tokens";
import { sendWelcomeEmail } from "@/lib/notifications/email";
import { auditAuthEvent } from "@/lib/auth/audit";
import { getSafeReturnTo } from "@/lib/auth/redirect";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const token = requestUrl.searchParams.get("token") ?? "";
  const returnTo = getSafeReturnTo(requestUrl.searchParams.get("returnTo"));
  if (token.length < 32) {
    const verifyUrl = new URL(`${getAppUrl()}/verify-email`);
    verifyUrl.searchParams.set("error", "invalid");
    if (returnTo !== "/dashboard") verifyUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(verifyUrl);
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

    const loginUrl = new URL(`${getAppUrl()}/login`);
    loginUrl.searchParams.set("verified", result.modifiedCount === 1 ? "1" : "0");
    if (returnTo !== "/dashboard") loginUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error("Email verification error:", error);
    const verifyUrl = new URL(`${getAppUrl()}/verify-email`);
    verifyUrl.searchParams.set("error", "unavailable");
    if (returnTo !== "/dashboard") verifyUrl.searchParams.set("returnTo", returnTo);
    return NextResponse.redirect(verifyUrl);
  }
}
