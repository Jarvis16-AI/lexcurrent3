import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy — LEX AI OS",
  description: "How LEX AI OS collects, uses, and protects your personal information.",
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
    <div className="text-gray-300 space-y-3 text-sm leading-relaxed">{children}</div>
  </section>
)

export default function PrivacyPolicy() {
  const effective = "June 14, 2026"
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="text-orange-400 text-sm hover:underline mb-8 inline-block">← Back to LEX</Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-gray-400 text-sm mb-10">Effective date: {effective} · Last updated: {effective}</p>

        <Section title="1. Introduction">
          <p>LEX AI OS ("LEX", "we", "us", or "our") is an AI-powered personal assistant application. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application, including our web app, Progressive Web App (PWA), and Android application (collectively, the "Service").</p>
          <p>By using LEX, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Service.</p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong className="text-white">2.1 Account Information</strong><br />When you sign in, we collect your email address, name, and profile picture through our authentication provider, Clerk (clerk.com). We do not store your password — authentication is managed entirely by Clerk.</p>
          <p><strong className="text-white">2.2 Conversation Data</strong><br />Messages you send to LEX are processed by Groq's AI infrastructure to generate responses. Conversation history may be stored in our database to provide continuity across sessions. You can delete your conversation history at any time.</p>
          <p><strong className="text-white">2.3 Memory Data</strong><br />LEX's memory system extracts and stores facts you share (e.g., your name, preferences, goals). This data is stored in our secure database and linked to your account. You can view and delete any memory entry from the Memory Tree in the app.</p>
          <p><strong className="text-white">2.4 Voice Data</strong><br />When you use voice input, your audio is sent to Groq's Whisper API for transcription. We do not store raw audio recordings. Voice output is generated via Microsoft Edge TTS and is not stored.</p>
          <p><strong className="text-white">2.5 Usage Data</strong><br />We collect anonymized usage patterns (e.g., which features you use, time of use) to improve the app. This data is not linked to your identity.</p>
          <p><strong className="text-white">2.6 Device Information</strong><br />We may collect device type, operating system, and browser type for compatibility and debugging purposes.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use your information to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide, operate, and improve the LEX Service</li>
            <li>Personalize your experience using your stored memories and preferences</li>
            <li>Process voice commands and generate AI responses</li>
            <li>Authenticate your identity and maintain session security</li>
            <li>Analyze usage trends to improve features (using anonymized data only)</li>
            <li>Comply with legal obligations</li>
          </ul>
          <p>We do <strong className="text-white">not</strong> sell your personal data. We do not use your data to train AI models without explicit consent.</p>
        </Section>

        <Section title="4. Third-Party Services">
          <p>LEX integrates with the following third-party services:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-white">Clerk (clerk.com)</strong> — Authentication and user account management. Subject to Clerk's Privacy Policy.</li>
            <li><strong className="text-white">Groq (groq.com)</strong> — AI language model inference and Whisper speech-to-text. Conversations are processed by Groq. Subject to Groq's Privacy Policy.</li>
            <li><strong className="text-white">Microsoft Edge TTS</strong> — Text-to-speech synthesis. No personal data is stored by Microsoft beyond the request.</li>
          </ul>
          <p>Each third-party service has its own privacy policy. We encourage you to review them.</p>
        </Section>

        <Section title="5. Data Retention">
          <p>We retain your data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time by contacting us.</p>
          <p>Memory entries are stored until you delete them. Conversation history is retained for session continuity and can be cleared within the app.</p>
        </Section>

        <Section title="6. Data Security">
          <p>We implement industry-standard security measures including TLS encryption in transit and encrypted storage at rest. However, no method of transmission over the internet is 100% secure.</p>
          <p>Access to your data is restricted to authorized personnel only, under strict confidentiality obligations.</p>
        </Section>

        <Section title="7. Your Rights">
          <p>Depending on your location, you may have rights including:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong className="text-white">Access:</strong> Request a copy of your personal data</li>
            <li><strong className="text-white">Correction:</strong> Request correction of inaccurate data</li>
            <li><strong className="text-white">Deletion:</strong> Request deletion of your data ("right to be forgotten")</li>
            <li><strong className="text-white">Portability:</strong> Receive your data in a portable format</li>
            <li><strong className="text-white">Opt-out:</strong> Opt out of non-essential data processing</li>
          </ul>
          <p>To exercise your rights, contact us at the address below.</p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>LEX is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn we have collected such information, we will delete it promptly.</p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of changes by updating the "Last updated" date at the top of this page. Continued use of the Service after changes constitutes acceptance.</p>
        </Section>

        <Section title="10. Contact Us">
          <p>If you have questions about this Privacy Policy or wish to exercise your rights, contact us at:</p>
          <p className="mt-2 p-4 bg-zinc-900 rounded-xl text-gray-300">
            LEX AI OS<br />
            Email: privacy@lexai.app<br />
            Website: <Link href="/" className="text-orange-400 hover:underline">lexai.app</Link>
          </p>
        </Section>

        <div className="border-t border-zinc-800 pt-8 mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-orange-400 transition-colors">Terms of Service</Link>
          <Link href="/data-safety" className="hover:text-orange-400 transition-colors">Data Safety</Link>
          <Link href="/" className="hover:text-orange-400 transition-colors">Back to LEX</Link>
        </div>
      </div>
    </div>
  )
}
