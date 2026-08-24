import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { getLinkedProviders } from "@/lib/auth/linked-providers";
import { sendPasswordChangedEmail } from "@/lib/notifications/email";
import { auditAuthEvent } from "@/lib/auth/audit";
import { resetPasswordSchema } from "@/lib/validators/auth";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid reset request" }, { status: 400 });
    }

    const db = await connectWithRetry();
    const users = await getUsersCollection(db);
    const user = await users.findOne({
      passwordResetTokenHash: hashToken(parsed.data.token),
      passwordResetExpiresAt: { $gt: new Date().toISOString() },
    });

    if (!user) {
      return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
    }

    const password = await bcrypt.hash(parsed.data.password, 12);
    const linkedProviders = getLinkedProviders({
      ...user,
      password,
    });
    const consumed = await users.updateOne(
      {
        _id: user._id,
        passwordResetTokenHash: hashToken(parsed.data.token),
        passwordResetExpiresAt: { $gt: new Date().toISOString() },
      },
      {
        $set: {
          password,
          provider: user.provider ?? "credentials",
          linkedProviders,
        },
        $unset: { passwordResetTokenHash: "", passwordResetExpiresAt: "" },
        $inc: { sessionVersion: 1 },
      }
    );

    if (consumed.matchedCount !== 1) {
      return NextResponse.json({ error: "This reset link is invalid or has already been used" }, { status: 400 });
    }

    auditAuthEvent("password_reset", { userId: user._id?.toString() });
    void sendPasswordChangedEmail(user.email, user.name).then((sent) => {
      if (!sent) console.warn("Password-changed security email could not be sent");
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset-password request error:", error);
    return NextResponse.json({ error: "Unable to reset the password" }, { status: 500 });
  }
}
