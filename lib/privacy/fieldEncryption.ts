import { decryptSecret, encryptSecret } from "@/lib/auth/secrets";

const PREFIX = "v1:";

export function encryptUserText(value: string) {
  return `${PREFIX}${encryptSecret(value)}`;
}

export function decryptUserText(value: string | undefined) {
  if (!value || !value.startsWith(PREFIX)) return value ?? "";
  try {
    return decryptSecret(value.slice(PREFIX.length));
  } catch {
    return "[encrypted content unavailable]";
  }
}

export function encryptUserJson(value: unknown) {
  return encryptUserText(JSON.stringify(value));
}

export function decryptUserJson<T>(value: string | undefined): T | undefined {
  const decrypted = decryptUserText(value);
  if (!decrypted || decrypted === "[encrypted content unavailable]") return undefined;
  try {
    return JSON.parse(decrypted) as T;
  } catch {
    return undefined;
  }
}
