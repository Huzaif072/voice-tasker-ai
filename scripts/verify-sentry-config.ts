const sourceMapNames = ["SENTRY_AUTH_TOKEN", "SENTRY_ORG", "SENTRY_PROJECT"] as const;
const sourceMapConfigured = sourceMapNames.map((name) => Boolean(process.env[name]?.trim()));
const configuredCount = sourceMapConfigured.filter(Boolean).length;
const serverRelease = process.env.SENTRY_RELEASE?.trim() ?? "";
const browserRelease = process.env.NEXT_PUBLIC_SENTRY_RELEASE?.trim() ?? "";

if (configuredCount > 0 && configuredCount < sourceMapNames.length) {
  const missing = sourceMapNames.filter((name) => !process.env[name]?.trim());
  throw new Error(`Sentry source-map configuration is incomplete; missing: ${missing.join(", ")}`);
}

if (configuredCount === sourceMapNames.length && (!serverRelease || !browserRelease)) {
  throw new Error("SENTRY_RELEASE and NEXT_PUBLIC_SENTRY_RELEASE are required when Sentry source-map upload is enabled");
}

if (serverRelease && browserRelease && serverRelease !== browserRelease) {
  throw new Error("SENTRY_RELEASE and NEXT_PUBLIC_SENTRY_RELEASE must identify the same release");
}

console.log(configuredCount === sourceMapNames.length
  ? `Sentry source-map configuration is complete for release ${serverRelease}`
  : "Sentry source-map upload is disabled; no complete deployment credential set was found");
