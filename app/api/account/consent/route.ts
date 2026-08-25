import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/middleware";
import { connectWithRetry } from "@/lib/db/mongodb";
import { getUsersCollection } from "@/lib/db/models/User";
import { PRIVACY_POLICY_VERSION, TERMS_VERSION, recordLegalConsent, recordLegalWithdrawal } from "@/lib/privacy/legal";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const db = await connectWithRetry();
  const user = await getUsersCollection(db).then((users) => users.findOne({ _id: new ObjectId(auth.user.id) }, { projection: { privacyPolicyVersion: 1, termsVersion: 1, privacyConsentAt: 1, termsAcceptedAt: 1, privacyConsentRevokedAt: 1 } }));
  return NextResponse.json({ current: { privacyPolicyVersion: PRIVACY_POLICY_VERSION, termsVersion: TERMS_VERSION }, accepted: user?.privacyPolicyVersion === PRIVACY_POLICY_VERSION && user?.termsVersion === TERMS_VERSION && !user?.privacyConsentRevokedAt, consent: user ? { privacyPolicyVersion: user.privacyPolicyVersion, termsVersion: user.termsVersion, privacyConsentAt: user.privacyConsentAt, termsAcceptedAt: user.termsAcceptedAt, privacyConsentRevokedAt: user.privacyConsentRevokedAt } : null });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const db = await connectWithRetry();
  const now = new Date().toISOString();
  await getUsersCollection(db).then((users) => users.updateOne({ _id: new ObjectId(auth.user.id) }, { $set: { privacyConsentRevokedAt: now } }));
  await recordLegalWithdrawal(db, auth.user.id, "account", now);
  return NextResponse.json({ success: true, revokedAt: now, note: "Account deletion remains available for complete erasure." });
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const db = await connectWithRetry();
  const now = new Date().toISOString();
  await getUsersCollection(db).then((users) => users.updateOne({ _id: new ObjectId(auth.user.id) }, { $set: { privacyPolicyVersion: PRIVACY_POLICY_VERSION, termsVersion: TERMS_VERSION, privacyConsentAt: now, termsAcceptedAt: now }, $unset: { privacyConsentRevokedAt: "" } }));
  await recordLegalConsent(db, auth.user.id, "account", now);
  return NextResponse.json({ success: true, privacyPolicyVersion: PRIVACY_POLICY_VERSION, termsVersion: TERMS_VERSION, acceptedAt: now });
}
