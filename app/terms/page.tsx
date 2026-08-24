import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use — VoiceTasker AI",
  description: "Development draft terms of use for VoiceTasker AI.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      lastUpdated="August 24, 2026"
      intro="These development-draft terms describe the intended rules for using VoiceTasker AI while the product is being built and tested."
    >
      <h2>1. The service</h2>
      <p>
        VoiceTasker AI is a voice-first task-management application. It is designed to help you capture
        tasks, interpret natural-language commands, organize priorities, create summaries, decompose work,
        delegate tasks, and receive contextual notifications.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You are responsible for providing accurate account information, protecting your sign-in details,
        and notifying the service operator if you believe your account has been accessed without permission.
        One person should not share an account in a way that compromises another person&apos;s information.
      </p>

      <h2>3. Voice commands and AI output</h2>
      <p>
        Voice recognition, intent parsing, generated subtasks, suggested priorities, reminders, and
        summaries may be inaccurate. You are responsible for reviewing important tasks, dates, assignments,
        and reminders before relying on them. VoiceTasker AI is a productivity tool and is not a substitute
        for professional, legal, medical, financial, safety, or emergency services.
      </p>

      <h2>4. Your content</h2>
      <p>
        You retain responsibility for the tasks, audio, transcripts, messages, personal information, and
        other content that you submit. You should not submit information that you are not authorized to
        process or disclose. You grant the service permission to process submitted content only as needed
        to provide, secure, maintain, and improve the service according to the final privacy policy.
      </p>

      <h2>5. Delegation and notifications</h2>
      <p>
        If you delegate a task or request an email, push notification, or other message, you confirm that
        you have a lawful basis and appropriate permission to contact the recipient. You are responsible
        for checking the recipient, task details, and timing before sending a delegation message.
      </p>

      <h2>6. Acceptable use</h2>
      <p>
        You may not use the service to break the law, impersonate another person, abuse or harass others,
        distribute malware, interfere with the service, evade security controls, or submit content that you
        do not have the right to process. The service operator may suspend access to protect users and the
        service.
      </p>

      <h2>7. Early access and pricing</h2>
      <p>
        During development, VoiceTasker AI may be offered as an early-access service without charge. No
        paid plan, usage limit, or billing amount is defined in this development project. If charges are
        introduced, the applicable price and billing terms should be presented before a paid service is
        activated.
      </p>

      <h2>8. Availability and changes</h2>
      <p>
        Development features may change, be interrupted, or be removed as the product evolves. The service
        operator may update these terms and should provide an appropriate notice when changes materially
        affect users.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these terms can be sent to <a href="mailto:hello@voicetasker.ai">hello@voicetasker.ai</a>.
      </p>
    </LegalPage>
  );
}
