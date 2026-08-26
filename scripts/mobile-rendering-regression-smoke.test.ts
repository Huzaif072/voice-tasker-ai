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
  const landingPage = await read("app/page.tsx");
  const pwaStatus = await read("components/dashboard/PwaStatus.tsx");
  const prioritySuggestions = await read("components/dashboard/PrioritySuggestions.tsx");
  const tasksPage = await read("app/dashboard/tasks/page.tsx");
  const taskDeleteModal = await read("components/dashboard/TaskDeleteModal.tsx");
  const dashboardPage = await read("app/dashboard/page.tsx");
  const dashboardLayout = await read("app/dashboard/layout.tsx");
  const header = await read("components/dashboard/Header.tsx");
  const sidebar = await read("components/dashboard/Sidebar.tsx");
  const taskFilters = await read("components/dashboard/TaskFilters.tsx");
  const dashboardStats = await read("components/dashboard/DashboardStats.tsx");
  const taskCard = await read("components/dashboard/TaskCard.tsx");
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
  assert.match(hero, /bg-\[linear-gradient/);
  assert.match(cta, /bg-\[linear-gradient/);
  assert.doesNotMatch(cta, /style=\{\{/);
  assert.doesNotMatch(landingPage, /backgroundImage/);
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
  assert.match(tasksPage, /TaskDeleteModal/);
  assert.doesNotMatch(tasksPage, /window\.confirm/);
  assert.match(taskDeleteModal, /Delete task\?/);
  assert.match(taskDeleteModal, /This action cannot be undone/);
  assert.match(taskDeleteModal, /onConfirm/);
  assert.match(dashboardPage, /TaskDeleteModal/);
  assert.doesNotMatch(dashboardPage, /window\.confirm/);
  assert.match(dashboardLayout, /max-w-\[1600px\]/);
  assert.match(header, /aria-label="Search tasks"/);
  assert.match(header, /min-h-10/);
  assert.match(sidebar, /Workspace/);
  assert.match(sidebar, /ml-auto h-1\.5 w-1\.5/);
  assert.match(taskFilters, /aria-pressed/);
  assert.match(taskFilters, /overflow-x-auto/);
  assert.match(dashboardStats, /grid-cols-2/);
  assert.match(taskCard, /opacity-100 .*sm:opacity-0/);
  assert.match(taskCard, /aria-label=\{`\$\{isCompleted/);
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
  console.log("PASS: mobile rendering, auth controls, service-worker refresh, PWA banner, dashboard feedback/AI action, transcription accuracy, delete-confirmation, hydration-safe landing, and authenticated dashboard UI contracts are covered");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
