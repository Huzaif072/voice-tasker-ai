import assert from "node:assert/strict";

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
  console.log("PASS: health endpoint returns a safe readiness failure without leaking dependency details.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
