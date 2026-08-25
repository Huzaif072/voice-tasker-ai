import assert from "node:assert/strict";
import { createProviderHealthResponse, type ProviderHealth } from "../app/api/health/providers/route";

async function main() {
  const previousUri = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  const { GET } = await import("../app/api/health/route");
  const response = await GET();
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.deepEqual(body, {
    ok: false,
    service: "voicetasker",
    dependencies: { mongodb: "unavailable" },
    timestamp: body.timestamp,
  });
  assert.equal(typeof body.timestamp, "string");
  if (previousUri) process.env.MONGODB_URI = previousUri;
  else delete process.env.MONGODB_URI;
  const providerStatuses: ProviderHealth = {
    mongodb: "ok",
    redis: "unavailable",
    groq: "configured",
    email: "unconfigured",
    push: "configured",
    googleCalendar: "disabled",
    twilio: "unconfigured",
    sentry: "configured",
    socket: "disabled",
  };
  const providerResponse = createProviderHealthResponse(providerStatuses);
  const providerBody = await providerResponse.json();
  assert.equal(providerResponse.status, 200);
  assert.equal(providerResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(providerBody.providers, providerStatuses);
  assert.equal(typeof providerBody.timestamp, "string");
  assert.equal(JSON.stringify(providerBody).includes("SENTRY_AUTH_TOKEN"), false);
  console.log("PASS: readiness and provider-health endpoints return safe, non-sensitive status contracts.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
