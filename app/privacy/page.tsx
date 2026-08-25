import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — VoiceTasker AI",
  description: "Privacy policy for VoiceTasker AI.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="August 24, 2026"
      intro="This policy explains the information VoiceTasker AI handles while you create and manage tasks by voice."
    >
      <h2>1. Information we collect</h2>
      <p>
        When you use VoiceTasker AI, the application may collect account information such as your name,
        email address, authentication provider, and password hash. It may also store the tasks, task
        descriptions, priorities, deadlines, subtasks, tags, reminders, and delegation details that you
        choose to create.
      </p>
      <p>
        When you submit a voice command, the application may process the audio to produce a transcript.
        The current MVP stores the transcript, parsed intent, confidence score, model name, and related
        task identifier in a voice-session log. The reviewed voice route does not save the raw audio file
        as a public audio URL.
      </p>

      <h2>2. How information is used</h2>
      <p>
        Information is used to authenticate you, create and organize tasks, interpret voice commands,
        generate summaries and subtasks, send delegation messages, deliver notifications, maintain
        realtime task updates, enforce rate limits, and improve the reliability of the application.
      </p>

      <h2>3. Service providers</h2>
      <p>
        Depending on the enabled configuration, relevant data may be processed by MongoDB, Groq speech and
        AI services, the configured email provider, web-push infrastructure, the hosting provider, Upstash Redis,
        Sentry, Google Calendar, or Twilio. Optional integrations are only used when their environment settings
        and user consent are enabled. The deployment owner must publish the providers and data-processing terms
        that apply to the deployed configuration.
      </p>

      <h2>4. Cookies and authentication</h2>
      <p>
        VoiceTasker AI uses an HTTP-only authentication cookie to maintain your signed-in session. The
        application may also use necessary technical storage for security, session handling, caching, and
        realtime updates. Optional analytics or marketing cookies should be documented here before they
        are enabled.
      </p>

      <h2>5. Retention and deletion</h2>
      <p>
        Account deletion removes the user-owned task, notification, voice-session, and account records through
        the application’s account-deletion flow, subject to lawful retention requirements. Terminal reminder
        delivery records expire after the configured 90-day period. The deployment owner must publish retention
        periods for active tasks, voice-session history, analytics events, logs, backups, and provider-side data.
      </p>

      <h2>6. Security</h2>
      <p>
        The application uses password hashing, signed authentication tokens, input validation, ownership
        checks, encrypted calendar tokens, redacted provider-health responses, and optional rate limiting. No
        online service can guarantee absolute security. Deployment owners must configure strong secrets, HTTPS,
        access controls, monitoring, tested backups, and an incident-response process.
      </p>

      <h2>7. Your choices</h2>
      <p>
        You can use the account export and deletion controls, submit typed commands instead of audio, disable
        optional provider integrations, and contact the address below for privacy requests. Correction, access,
        restriction, portability, and objection rights depend on applicable law and the deployment owner’s process.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about privacy can be sent to <a href="mailto:hello@voicetasker.ai">hello@voicetasker.ai</a>.
      </p>
    </LegalPage>
  );
}
