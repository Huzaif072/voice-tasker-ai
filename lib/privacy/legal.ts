import type { Db } from "mongodb";
import { getLegalConsentsCollection, type LegalConsentDocument } from "@/lib/db/models/LegalConsent";

export const PRIVACY_POLICY_VERSION = process.env.PRIVACY_POLICY_VERSION?.trim() || "2026-08-26";
export const TERMS_VERSION = process.env.TERMS_VERSION?.trim() || "2026-08-26";

export async function recordLegalConsent(db: Db, userId: string, source: LegalConsentDocument["source"], acceptedAt = new Date().toISOString()) {
  const consents = await getLegalConsentsCollection(db);
  await consents.insertOne({ userId, privacyPolicyVersion: PRIVACY_POLICY_VERSION, termsVersion: TERMS_VERSION, acceptedAt, action: "accepted", source });
}

export async function recordLegalWithdrawal(db: Db, userId: string, source: LegalConsentDocument["source"], withdrawnAt = new Date().toISOString()) {
  const consents = await getLegalConsentsCollection(db);
  await consents.insertOne({ userId, privacyPolicyVersion: PRIVACY_POLICY_VERSION, termsVersion: TERMS_VERSION, acceptedAt: withdrawnAt, action: "withdrawn", source });
}
