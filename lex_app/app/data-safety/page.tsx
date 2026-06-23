import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Data Safety — LEX AI OS",
  description: "Information about how LEX AI OS handles your data, required for Google Play.",
}

const Row = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-zinc-800 last:border-0">
    <span className="text-gray-400 text-sm sm:w-56 shrink-0">{label}</span>
    <div>
      <span className="text-white text-sm font-medium">{value}</span>
      {note && <p className="text-gray-500 text-xs mt-0.5">{note}</p>}
    </div>
  </div>
)

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-zinc-900 rounded-2xl p-5 mb-6">
    <h2 className="text-base font-bold text-white mb-4">{title}</h2>
    {children}
  </div>
)

export default function DataSafety() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="text-orange-400 text-sm hover:underline mb-8 inline-block">← Back to LEX</Link>

        <h1 className="text-3xl font-bold mb-2">Data Safety</h1>
        <p className="text-gray-400 text-sm mb-2">This page provides Google Play-required transparency about data LEX collects and how it is handled.</p>
        <p className="text-gray-500 text-xs mb-10">Last updated: June 14, 2026</p>

        {/* Safety Highlights */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { icon: "🔒", title: "Data encrypted in transit", sub: "TLS 1.3 on all connections" },
            { icon: "🗑️", title: "You can request deletion", sub: "Email us anytime" },
            { icon: "🚫", title: "Data not sold", sub: "Never shared for ads" },
            { icon: "🔐", title: "Encrypted at rest", sub: "Secure database storage" },
          ].map(h => (
            <div key={h.title} className="bg-zinc-900 rounded-xl p-4">
              <div className="text-2xl mb-2">{h.icon}</div>
              <p className="text-sm font-semibold text-white">{h.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{h.sub}</p>
            </div>
          ))}
        </div>

        <Card title="Data Collected">
          <Row label="Account info (email, name)" value="Collected" note="Required for sign-in via Clerk" />
          <Row label="User messages / prompts" value="Collected" note="Processed by Groq AI to generate responses; may be retained for conversation history" />
          <Row label="Voice audio" value="Processed, not stored" note="Sent to Groq Whisper for transcription; raw audio is not retained" />
          <Row label="Memory entries" value="Collected" note="Facts extracted from conversations and stored; you can delete any entry" />
          <Row label="Usage patterns" value="Collected (anonymized)" note="Feature usage, session timing — not linked to identity" />
          <Row label="Device / app info" value="Collected" note="OS, browser type, app version for compatibility" />
          <Row label="Location" value="Not collected" note="LEX does not request or store your location" />
          <Row label="Contacts / photos" value="Not collected" note="Camera access is optional and images are not stored" />
          <Row label="Financial info" value="Not collected" note="Payments handled externally; we do not store card details" />
        </Card>

        <Card title="Data Sharing">
          <Row
            label="Clerk (authentication)"
            value="Shared"
            note="Email, name, and session tokens are managed by Clerk. See clerk.com/privacy"
          />
          <Row
            label="Groq (AI inference)"
            value="Shared"
            note="Your messages and voice audio are sent to Groq for processing. See groq.com/privacy"
          />
          <Row
            label="Microsoft Edge TTS"
            value="Shared (text only)"
            note="Text to be spoken is sent to Microsoft's TTS service. No personal data is retained."
          />
          <Row label="Advertising networks" value="Not shared" note="We do not share data with ad networks" />
          <Row label="Law enforcement" value="If legally required" note="We may disclose data when required by valid legal process" />
        </Card>

        <Card title="Data Handling Practices">
          <Row label="Encryption in transit" value="Yes" note="All data is encrypted using TLS 1.3" />
          <Row label="Encryption at rest" value="Yes" note="Database storage is encrypted" />
          <Row label="Data minimization" value="Yes" note="We only collect what is necessary to provide the Service" />
          <Row label="Retention period" value="Until account deletion" note="Or shorter where noted (e.g. voice audio is never stored)" />
          <Row label="User can request deletion" value="Yes" note="Contact privacy@lexai.app to delete all your data" />
          <Row label="User can export data" value="Yes" note="Contact us to request a data export" />
          <Row label="Children under 13" value="Not targeted" note="LEX is not directed to children under 13" />
        </Card>

        <Card title="Permissions Used (Android)">
          <Row label="INTERNET" value="Required" note="Connecting to LEX servers and AI providers" />
          <Row label="RECORD_AUDIO" value="Optional" note="Voice input — only used when you tap the microphone" />
          <Row label="CAMERA" value="Optional" note="Photo sharing — only used when you tap the camera button" />
          <Row label="VIBRATE" value="Optional" note="Haptic feedback for notifications" />
        </Card>

        <div className="bg-zinc-900 rounded-2xl p-5 mb-8">
          <h2 className="text-base font-bold text-white mb-2">Your Rights & Requests</h2>
          <p className="text-sm text-gray-300 mb-4">You have the right to access, correct, export, or delete your data at any time.</p>
          <div className="flex flex-wrap gap-3">
            <a href="mailto:privacy@lexai.app?subject=Data%20Deletion%20Request"
               className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
              Request Data Deletion
            </a>
            <a href="mailto:privacy@lexai.app?subject=Data%20Export%20Request"
               className="border border-zinc-700 hover:border-orange-400 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
              Request Data Export
            </a>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-8 mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/privacy-policy" className="hover:text-orange-400 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-orange-400 transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-orange-400 transition-colors">Back to LEX</Link>
        </div>
      </div>
    </div>
  )
}
