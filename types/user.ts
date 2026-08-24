export interface VoiceSettings {
  language: string;
  speed: number;
  enabled: boolean;
}

export type AuthProvider = "credentials" | "google" | "apple";

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
  createdAt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  sessionVersion?: number;
  emailVerifiedAt?: string;
}
