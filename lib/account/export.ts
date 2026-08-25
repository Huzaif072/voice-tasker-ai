import type { UserDocument } from "@/lib/db/models/User";

export const MAX_EXPORT_RECORDS = 10_000;

export function sanitizeUserForExport(user: UserDocument) {
  return {
    id: user._id?.toString(),
    name: user.name,
    email: user.email,
    provider: user.provider,
    emailVerifiedAt: user.emailVerifiedAt,
    voiceSettings: user.voiceSettings,
    ...(user.reminderSettings ? { reminderSettings: user.reminderSettings } : {}),
    ...(user.behaviorProfile ? { behaviorProfile: user.behaviorProfile } : {}),
    ...(user.privacyPolicyVersion ? { privacyPolicyVersion: user.privacyPolicyVersion } : {}),
    ...(user.termsVersion ? { termsVersion: user.termsVersion } : {}),
    ...(user.privacyConsentAt ? { privacyConsentAt: user.privacyConsentAt } : {}),
    ...(user.termsAcceptedAt ? { termsAcceptedAt: user.termsAcceptedAt } : {}),
    ...(user.privacyConsentRevokedAt ? { privacyConsentRevokedAt: user.privacyConsentRevokedAt } : {}),
    createdAt: user.createdAt,
  };
}
