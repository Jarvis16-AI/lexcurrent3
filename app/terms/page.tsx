import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service — LEX AI OS",
  description: "Terms and conditions for using LEX AI OS.",
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
    <div className="text-gray-300 space-y-3 text-sm leading-relaxed">{children}</div>
  </section>
)

export default function Terms() {
  const effective = "June 14, 2026"
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="text-orange-400 text-sm hover:underline mb-8 inline-block">← Back to LEX</Link>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-gray-400 text-sm mb-10">Effective date: {effective} · Last updated: {effective}</p>

        <Section title="1. Acceptance of Terms">
          <p>By accessing or using LEX AI OS ("LEX", "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.</p>
          <p>We reserve the right to modify these Terms at any time. Continued use of the Service after modifications constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>LEX is an AI-powered personal assistant that provides conversational AI, voice interaction, memory management, and productivity features. The Service is available via web browser, Progressive Web App, and Android application.</p>
          <p>LEX uses third-party AI providers including Groq for language model inference and speech recognition, and Microsoft Edge TTS for voice synthesis.</p>
        </Section>

        <Section title="3. Account Registration">
          <p>To use certain features, you must create an account using our authentication provider (Clerk). You agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of unauthorized account access</li>
            <li>Be responsible for all activity under your account</li>
          </ul>
          <p>We reserve the right to suspend or terminate accounts that violate these Terms.</p>
        </Section>

        <Section title="4. Acceptable Use">
          <p>You agree <strong className="text-white">not</strong> to use LEX to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Generate illegal, harmful, abusive, or harassing content</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe intellectual property rights of any third party</li>
            <li>Distribute malware, spam, or phishing content</li>
            <li>Attempt to reverse-engineer, scrape, or extract the underlying AI models</li>
            <li>Use the Service in any manner that could damage, disable, or impair the Service</li>
            <li>Attempt to gain unauthorized access to any systems or data</li>
          </ul>
        </Section>

        <Section title="5. AI-Generated Content">
          <p>LEX generates responses using AI language models. You acknowledge that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>AI responses may be inaccurate, incomplete, or misleading</li>
            <li>AI responses do not constitute professional advice (medical, legal, financial, etc.)</li>
            <li>You are solely responsible for decisions made based on AI-generated content</li>
            <li>We do not guarantee the accuracy or reliability of AI responses</li>
          </ul>
        </Section>

        <Section title="6. Intellectual Property">
          <p>The LEX application, including its design, code, branding, and features, is owned by LEX AI OS and protected by intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the Service without our prior written consent.</p>
          <p>Content you provide (messages, inputs) remains yours. By using the Service, you grant us a limited license to process your content solely to provide the Service.</p>
        </Section>

        <Section title="7. Subscription Plans & Payments">
          <p>LEX offers free and paid subscription tiers. Paid plans provide access to additional AI models, increased usage limits, and premium features.</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>All subscription fees are non-refundable unless required by law</li>
            <li>We reserve the right to change pricing with 30 days notice</li>
            <li>Cancellation takes effect at the end of the current billing period</li>
          </ul>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.</p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>TO THE FULLEST EXTENT PERMITTED BY LAW, LEX AI OS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR DATA, ARISING FROM YOUR USE OF THE SERVICE.</p>
          <p>OUR TOTAL LIABILITY TO YOU SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS OR (B) $100 USD.</p>
        </Section>

        <Section title="10. Termination">
          <p>We reserve the right to terminate or suspend your access to the Service at any time, with or without notice, for any reason, including violation of these Terms.</p>
          <p>You may terminate your account at any time by contacting us. Upon termination, your right to use the Service ceases immediately.</p>
        </Section>

        <Section title="11. Governing Law">
          <p>These Terms are governed by and construed in accordance with applicable law. Any disputes shall be resolved through binding arbitration, except where prohibited by law.</p>
        </Section>

        <Section title="12. Contact">
          <p className="p-4 bg-zinc-900 rounded-xl text-gray-300">
            LEX AI OS<br />
            Email: legal@lexai.app<br />
            Website: <Link href="/" className="text-orange-400 hover:underline">lexai.app</Link>
          </p>
        </Section>

        <div className="border-t border-zinc-800 pt-8 mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/privacy-policy" className="hover:text-orange-400 transition-colors">Privacy Policy</Link>
          <Link href="/data-safety" className="hover:text-orange-400 transition-colors">Data Safety</Link>
          <Link href="/" className="hover:text-orange-400 transition-colors">Back to LEX</Link>
        </div>
      </div>
    </div>
  )
}
