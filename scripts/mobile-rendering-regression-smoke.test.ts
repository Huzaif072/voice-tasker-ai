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
  const pwaStatus = await read("components/dashboard/PwaStatus.tsx");
  const prioritySuggestions = await read("components/dashboard/PrioritySuggestions.tsx");
  const input = await read("components/ui/Input.tsx");
  const signupForm = await read("components/auth/SignupForm.tsx");
  const serviceWorker = await read("public/push-sw.js");
  const voicePage = await read("app/dashboard/voice/page.tsx");
  const voiceRecorder = await read("hooks/useVoiceRecorder.ts");
  const whisper = await read("lib/groq/whisper.ts");
  const voiceSchema = await read("lib/validators/voice.ts");

  assert.match(login, /Suspense fallback=/);
  assert.match(signup, /Suspense fallback=/);
  assert.doesNotMatch(login, /useSearchParams/);
  assert.doesNotMatch(signup, /useSearchParams/);
  assert.doesNotMatch(oauth, /useSearchParams/);
  assert.match(hero, /initial=\{false\}/);
  assert.match(features, /initial=\{false\}/);
  assert.match(cta, /initial=\{false\}/);
  assert.match(pwaStatus, /md:right-8/);
  assert.match(pwaStatus, /md:bottom-24/);
  assert.match(pwaStatus, /safe-area-inset-bottom/);
  assert.match(pwaStatus, /bottom-20/);
  assert.match(pwaStatus, /Dismiss install message/);
  assert.match(pwaStatus, /setInstallDismissed/);
  assert.match(prioritySuggestions, /requestAiDeadline/);
  assert.match(prioritySuggestions, /AI was unavailable/);
  assert.match(prioritySuggestions, /Ask AI failed/);
  assert.equal((prioritySuggestions.match(/<FeedbackButtons category="priority" \/>/g) ?? []).length, 1);
  assert.doesNotMatch(prioritySuggestions, /category="deadline"/);
  assert.match(input, /min-h-11 min-w-11/);
  assert.match(input, /touch-manipulation/);
  assert.match(input, /onTouchEnd/);
  assert.match(signupForm, /onInput=/);
  assert.match(serviceWorker, /voicetasker-static-v4/);
  assert.match(voicePage, /transcription-language/);
  assert.match(voiceRecorder, /echoCancellation: true/);
  assert.match(voiceRecorder, /noiseSuppression: true/);
  assert.match(voiceRecorder, /autoGainControl: true/);
  assert.match(voiceRecorder, /language, conversationId/);
  assert.match(voiceRecorder, /ur-PK/);
  assert.match(whisper, /VOICETASKER_TRANSCRIPTION_PROMPT/);
  assert.match(whisper, /language === "auto"/);
  assert.match(whisper, /temperature: 0/);
  assert.match(voiceSchema, /language: z\.enum\(\["auto", "en", "ur"\]\)/);
  const localWhisper = await read("lib/whisper-cpp/transcribe.ts");
  assert.match(localWhisper, /"-l"/);
  assert.match(localWhisper, /language/);
  console.log("PASS: mobile rendering, auth controls, service-worker refresh, PWA banner, dashboard feedback/AI action, and transcription accuracy contracts are covered");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
