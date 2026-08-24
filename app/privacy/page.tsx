import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — VoiceTasker AI",
  description: "Development draft privacy policy for VoiceTasker AI.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="August 24, 2026"
      intro="This development draft explains the information VoiceTasker AI is designed to handle while you create and manage tasks by voice."
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
        The development architecture may send relevant data to infrastructure providers used by the
        application, such as a MongoDB database, an AI and speech-processing provider, an email provider,
        a push-notification provider, a hosting provider, and an optional Redis service. The final provider
        list, data-processing terms, and international-transfer details must be confirmed before launch.
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
        Task, account, notification, and voice-session retention periods are part of the development
        configuration and must be finalized before public launch. The final product should provide a way
        to request account deletion and remove or anonymize associated personal data, subject to lawful
        retention requirements.
      </p>

      <h2>6. Security</h2>
      <p>
        The project uses password hashing, signed authentication tokens, input validation, ownership
        checks, and optional rate limiting. No online service can guarantee absolute security. Production
        deployment should enforce strong secrets, HTTPS, access controls, monitoring, backups, and a
        documented incident-response process.
      </p>

      <h2>7. Your choices</h2>
      <p>
        You should be able to access, correct, export, or delete your account information, subject to
        applicable law and the final product capabilities. You may choose to use typed commands instead
        of submitting audio when that option is available.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about privacy can be sent to <a href="mailto:hello@voicetasker.ai">hello@voicetasker.ai</a>.
      </p>
    </LegalPage>
  );
}
