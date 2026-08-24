import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection, defaultVoiceSettings } from "@/lib/db/models/User";
import { signToken } from "@/lib/auth/jwt";
import { addLinkedProvider, getLinkedProviders } from "@/lib/auth/linked-providers";
import { sendWelcomeEmail } from "@/lib/notifications/email";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

interface GoogleProfile {
  id: string;
  email: string;
  name?: string;
  verified_email?: boolean;
}

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function handleGoogleCallback(code: string) {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) throw new Error("Failed to exchange Google auth code");
  const tokens = await tokenRes.json();

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) throw new Error("Failed to fetch Google user info");
  const profile = (await userRes.json()) as GoogleProfile;

  if (!profile.id || !profile.email || profile.verified_email !== true) {
    throw new Error("Google account email is not verified");
  }

  const normalizedEmail = profile.email.trim().toLowerCase();
  const db = await connectWithRetry();
  const users = await getUsersCollection(db);
  const now = new Date().toISOString();

  const identityUser = await users.findOne({
    $or: [
      { provider: "google", providerId: profile.id },
      { linkedProviders: { $elemMatch: { provider: "google", providerId: profile.id } } },
    ],
  });
  let user = identityUser ?? (await users.findOne({ email: normalizedEmail }));
  let isNewUser = false;
  if (!user) {
    const name = profile.name?.trim() || normalizedEmail.split("@")[0];
    isNewUser = true;
    const result = await users.insertOne({
      name,
      email: normalizedEmail,
      provider: "google",
      providerId: profile.id,
      linkedProviders: [{ provider: "google", providerId: profile.id, linkedAt: now }],
      voiceSettings: defaultVoiceSettings,
      createdAt: now,
      emailVerifiedAt: now,
      sessionVersion: 0,
    });
    user = await users.findOne({ _id: result.insertedId });
  } else {
    const existingGoogle = getLinkedProviders(user).find((item) => item.provider === "google");
    if (existingGoogle?.providerId && existingGoogle.providerId !== profile.id) {
      throw new Error("Google identity does not match the linked account");
    }

    const linkedProviders = addLinkedProvider(user, { provider: "google", providerId: profile.id });
    await users.updateOne(
      { _id: user._id },
      { $set: { linkedProviders, emailVerifiedAt: user.emailVerifiedAt ?? now } }
    );
    user = await users.findOne({ _id: user._id });
  }

  if (!user) throw new Error("Failed to create or find user");

  const authUser = {
    id: user._id!.toString(),
    name: user.name,
    email: user.email,
    sessionVersion: user.sessionVersion ?? 0,
    emailVerifiedAt: user.emailVerifiedAt,
  };

  if (isNewUser) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const welcomeSent = await sendWelcomeEmail(
      authUser.email,
      authUser.name,
      `${baseUrl.replace(/\/$/, "")}/dashboard`
    );
    if (!welcomeSent) {
      console.warn("Welcome email could not be sent; Google account creation will continue");
    }
  }

  return { authUser, token: signToken(authUser) };
}
