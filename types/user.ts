export interface VoiceSettings {
  language: string;
  speed: number;
  enabled: boolean;
}

export type AuthProvider = "credentials" | "google" | "apple";
export type ReminderChannel = "in_app" | "email" | "push" | "voice";

export interface ReminderSettings {
  enabled: boolean;
  channels: ReminderChannel[];
}

export interface LinkedProvider {
  provider: AuthProvider;
  providerId?: string;
  linkedAt: string;
}

export interface BehaviorProfile {
  completedTaskCount: number;
  highPriorityCompletedCount: number;
  completionByPriority?: Partial<Record<TaskPriorityKey, number>>;
  completionByTag?: Record<string, number>;
  highPriorityByTag?: Record<string, number>;
  preferredCompletionHour?: number;
  updatedAt: string;
}

type TaskPriorityKey = "low" | "medium" | "high" | "urgent";

export interface User {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  provider?: AuthProvider;
  providerId?: string;
  linkedProviders?: LinkedProvider[];
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: string;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: string;
  emailVerifiedAt?: string;
  sessionVersion?: number;
  disabledAt?: string;
  privacyPolicyVersion?: string;
  termsVersion?: string;
  privacyConsentAt?: string;
  termsAcceptedAt?: string;
  privacyConsentRevokedAt?: string;
  voiceSettings: VoiceSettings;
  pushSubscription?: unknown;
  pushSubscriptionEncrypted?: string;
  pushSubscriptionUpdatedAt?: string;
  reminderSettings?: ReminderSettings;
  behaviorProfile?: BehaviorProfile;
  googleCalendarAccessToken?: string;
  googleCalendarRefreshToken?: string;
  googleCalendarExpiresAt?: string;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  sessionVersion?: number;
  emailVerifiedAt?: string;
}
