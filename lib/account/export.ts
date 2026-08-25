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
    createdAt: user.createdAt,
  };
}
