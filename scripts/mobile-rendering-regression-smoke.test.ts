import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function read(relativePath: string) {
  return readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

async function main() {
  const login = await read("app/(auth)/login/page.tsx");
  const signup = await read("app/(auth)/signup/page.tsx");
  const oauth = await read("components/auth/OAuthButtons.tsx");
  const hero = await read("components/landing/HeroSection.tsx");
  const features = await read("components/landing/FeaturesGrid.tsx");
  const cta = await read("components/landing/CTASection.tsx");

  assert.match(login, /Suspense fallback=/);
  assert.match(signup, /Suspense fallback=/);
  assert.doesNotMatch(login, /useSearchParams/);
  assert.doesNotMatch(signup, /useSearchParams/);
  assert.doesNotMatch(oauth, /useSearchParams/);
  assert.match(hero, /initial=\{false\}/);
  assert.match(features, /initial=\{false\}/);
  assert.match(cta, /initial=\{false\}/);
  console.log("PASS: mobile auth fallback and server-visible landing content contracts are covered");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
