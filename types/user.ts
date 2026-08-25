export interface VoiceSettings {
  language: string;
  speed: number;
  enabled: boolean;
}

export type AuthProvider = "credentials" | "google" | "apple";
export type ReminderChannel = "in_app" | "email" | "push";

export interface ReminderSettings {
  enabled: boolean;
  channels: ReminderChannel[];
}

export interface LinkedProvider {
  provider: AuthProvider;
  providerId?: string;
  linkedAt: string;
}

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
  voiceSettings: VoiceSettings;
  pushSubscription?: unknown;
  pushSubscriptionUpdatedAt?: string;
  reminderSettings?: ReminderSettings;
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
