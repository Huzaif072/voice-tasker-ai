import jwt from "jsonwebtoken";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection, defaultVoiceSettings } from "@/lib/db/models/User";
import { signToken } from "@/lib/auth/jwt";
import { addLinkedProvider, getLinkedProviders } from "@/lib/auth/linked-providers";
import { sendWelcomeEmail } from "@/lib/notifications/email";

const APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize";
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_KEYS_URL = new URL("https://appleid.apple.com/auth/keys");
const APPLE_JWKS = createRemoteJWKSet(APPLE_KEYS_URL);
const CLIENT_SECRET_LIFETIME_SECONDS = 60 * 60 * 24 * 180;

function getAppleClientId() {
  const value = process.env.APPLE_CLIENT_ID;
  if (!value) throw new Error("APPLE_CLIENT_ID is not configured");
  return value;
}

function getAppleRedirectUri() {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return process.env.APPLE_REDIRECT_URI ?? `${baseUrl}/api/auth/apple/callback`;
}

function getAppleClientSecret() {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!teamId || !keyId || !privateKey) {
    throw new Error("Apple OAuth credentials are not fully configured");
  }

  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: teamId,
      iat: now,
      exp: now + CLIENT_SECRET_LIFETIME_SECONDS,
      aud: APPLE_ISSUER,
      sub: getAppleClientId(),
    },
    privateKey,
    { algorithm: "ES256", keyid: keyId }
  );
}

export function isAppleConfigured() {
  return Boolean(
    process.env.APPLE_CLIENT_ID &&
      process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID &&
      process.env.APPLE_PRIVATE_KEY
  );
}

export function getAppleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: getAppleClientId(),
    redirect_uri: getAppleRedirectUri(),
    response_type: "code",
    response_mode: "form_post",
    scope: "name email",
    state,
  });

  return `${APPLE_AUTH_URL}?${params.toString()}`;
}

interface AppleName {
  firstName?: string;
  lastName?: string;
}

interface AppleUserPayload {
  name?: AppleName;
  email?: string;
}

function getNameFromApple(profile: AppleUserPayload | undefined, email: string) {
  const firstName = profile?.name?.firstName?.trim();
  const lastName = profile?.name?.lastName?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  return fullName || email.split("@")[0];
}

async function exchangeCode(code: string) {
  const response = await fetch(APPLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getAppleClientId(),
      client_secret: getAppleClientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: getAppleRedirectUri(),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Apple token exchange failed: ${detail.slice(0, 200)}`);
  }

  return (await response.json()) as { id_token?: string };
}

async function verifyAppleIdentityToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
    issuer: APPLE_ISSUER,
    audience: getAppleClientId(),
  });

  if (!payload.sub || typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("Apple account email is not verified");
  }

  return { sub: payload.sub, email: payload.email.trim().toLowerCase() };
}

export async function handleAppleCallback(code: string, userPayload?: AppleUserPayload) {
  const tokens = await exchangeCode(code);
  if (!tokens.id_token) throw new Error("Apple did not return an identity token");

  const identity = await verifyAppleIdentityToken(tokens.id_token);
  const db = await connectWithRetry();
  const users = await getUsersCollection(db);
  const now = new Date().toISOString();

  let user = await users.findOne({
    $or: [
      { provider: "apple", providerId: identity.sub },
      { linkedProviders: { $elemMatch: { provider: "apple", providerId: identity.sub } } },
    ],
  });
  if (!user) user = await users.findOne({ email: identity.email });

  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const result = await users.insertOne({
      name: getNameFromApple(userPayload, identity.email),
      email: identity.email,
      provider: "apple",
      providerId: identity.sub,
      linkedProviders: [{ provider: "apple", providerId: identity.sub, linkedAt: now }],
      voiceSettings: defaultVoiceSettings,
      createdAt: now,
      emailVerifiedAt: now,
      sessionVersion: 0,
    });
    user = await users.findOne({ _id: result.insertedId });
  } else {
    const existingApple = getLinkedProviders(user).find((item) => item.provider === "apple");
    if (existingApple?.providerId && existingApple.providerId !== identity.sub) {
      throw new Error("Apple identity does not match the linked account");
    }

    const linkedProviders = addLinkedProvider(user, { provider: "apple", providerId: identity.sub });
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          linkedProviders,
          emailVerifiedAt: user.emailVerifiedAt ?? now,
          ...(user.name === "User" ? { name: getNameFromApple(userPayload, identity.email) } : {}),
        },
      }
    );
    user = await users.findOne({ _id: user._id });
  }

  if (!user) throw new Error("Failed to create or find Apple user");

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
      console.warn("Welcome email could not be sent; Apple account creation will continue");
    }
  }

  return { authUser, token: signToken(authUser) };
}
