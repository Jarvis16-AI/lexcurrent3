import {
  Mic,
  PlayCircle,
  MessageCircle,
  Calendar,
  Bell,
  CheckCircle2,
  Keyboard,
  Share2,
  ScanLine,
  Settings,
  Search,
  Navigation,
  FileText,
  Sparkles,
  Camera,
  Folder,
  ChevronLeft,
} from "lucide-react"
import { PhoneFrame, StatusBar, HomeIndicator, Orb, NavDock, GlassCard } from "./primitives"

/* Waveform bars */
function Waveform() {
  return (
    <div className="flex items-end justify-center gap-[3px]">
      {Array.from({ length: 34 }).map((_, i) => {
        const h = 6 + Math.abs(Math.sin(i * 0.8)) * 26
        return <span key={i} className="w-[3px] rounded-full bg-primary/70" style={{ height: `${h}px` }} />
      })}
    </div>
  )
}

/* 1. Listening & Voice */
export function ListeningVoice() {
  return (
    <PhoneFrame label="Listening & Voice" sublabel="Tap, speak, and Lex listens">
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-lg font-bold text-primary">LEX</h2>
        <div className="flex gap-3 text-muted-foreground">
          <ScanLine className="size-4" />
          <Settings className="size-4" />
        </div>
      </div>
      <p className="mt-8 text-center text-xl font-semibold text-primary">Listening...</p>
      <div className="mt-6 px-6">
        <Waveform />
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">Tap to speak</p>
      <div className="mt-4 flex justify-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Mic className="size-6" />
        </div>
      </div>
      <div className="mt-6 space-y-2 px-5">
        <VoiceChip icon={<PlayCircle className="size-4 text-[#ff0000]" />} text="Open YouTube" />
        <VoiceChip icon={<MessageCircle className="size-4 text-[#30d158]" />} text="Send message to John" />
        <VoiceChip icon={<Calendar className="size-4 text-primary" />} text="What's on my calendar?" />
        <VoiceChip icon={<Bell className="size-4 text-primary" />} text="Read my notifications" />
      </div>
      <div className="mt-auto flex items-center justify-between px-7 pb-1 pt-2 text-muted-foreground">
        <Keyboard className="size-5" />
        <Orb className="size-10" />
        <Share2 className="size-5" />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  )
}

function VoiceChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2.5">
      <span className="flex size-7 items-center justify-center rounded-full bg-accent/50">{icon}</span>
      <span className="text-xs font-medium text-foreground">{text}</span>
    </div>
  )
}

/* 2. Processing */
export function Processing() {
  return (
    <PhoneFrame label="Processing" sublabel="Thinking & analyzing">
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-lg font-bold text-primary">LEX</h2>
        <Settings className="size-4 text-muted-foreground" />
      </div>
      <p className="mt-6 text-center text-lg font-semibold text-foreground">Processing...</p>
      <p className="mt-1 px-10 text-center text-xs text-muted-foreground text-balance">
        Reading your screen and preparing a response.
      </p>
      <div className="relative mt-6 flex justify-center">
        <div className="absolute top-1/2 size-40 -translate-y-1/2 rounded-full border border-primary/20" />
        <div className="absolute top-1/2 size-32 -translate-y-1/2 rounded-full border border-primary/30" />
        <Orb className="size-28" />
      </div>
      <div className="mt-10 px-5">
        <GlassCard className="p-3">
          <p className="mb-2 text-xs font-medium text-foreground">You can ask me to</p>
          <AskRow icon={<FileText className="size-3.5 text-primary" />} text="Summarize this page" />
          <AskRow icon={<Sparkles className="size-3.5 text-primary" />} text="Extract key info" />
          <AskRow icon={<Mic className="size-3.5 text-primary" />} text="Take action" />
          <AskRow icon={<Search className="size-3.5 text-primary" />} text="Answer anything" />
        </GlassCard>
      </div>
      <div className="mt-auto flex items-center justify-between px-7 pb-1 pt-2 text-muted-foreground">
        <Keyboard className="size-5" />
        <Share2 className="size-5" />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  )
}

function AskRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {icon}
      <span className="text-xs text-foreground">{text}</span>
    </div>
  )
}

/* 3. Auto Assist / Background Assistant */
export function AutoAssist() {
  return (
    <PhoneFrame label="Background Assistant" sublabel="Lex works quietly in the background">
      <StatusBar />
      <div className="px-5 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">Auto Assist</h3>
          <span className="rounded-full bg-[#30d158]/15 px-2 py-0.5 text-[10px] font-medium text-[#1a9e3f]">On</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground text-pretty">
          Lex is working in the background to help you stay ahead.
        </p>
      </div>
      <div className="mt-3 px-5">
        <GlassCard className="p-3">
          <Status text="Reading your screen" />
          <Status text="Monitoring notifications" />
          <Status text="Managing tasks" />
          <Status text="Ready to assist" />
        </GlassCard>
      </div>
      <div className="mt-4 px-5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Recent activity</p>
        <GlassCard className="p-3">
          <Activity icon={<Navigation className="size-3.5 text-primary" />} text="Navigated to Airport" time="10:30 AM" />
          <Activity icon={<PlayCircle className="size-3.5 text-[#ff0000]" />} text="Opened YouTube" time="9:45 AM" />
          <Activity icon={<Bell className="size-3.5 text-primary" />} text="Summarized notifications" time="9:30 AM" />
          <Activity icon={<MessageCircle className="size-3.5 text-[#30d158]" />} text="Called Mom" time="Yesterday" />
        </GlassCard>
      </div>
      <NavDock active="profile" showOrb />
      <HomeIndicator />
    </PhoneFrame>
  )
}

function Status({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <CheckCircle2 className="size-3.5 text-[#30d158]" />
      <span className="text-xs text-foreground">{text}</span>
    </div>
  )
}

function Activity({ icon, text, time }: { icon: React.ReactNode; text: string; time: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-foreground">{text}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{time}</span>
    </div>
  )
}

/* 4. Context Awareness — You're reading Reddit */
export function ContextAwareness() {
  return (
    <PhoneFrame label="Context Awareness" sublabel="Lex understands what you're doing">
      <StatusBar />
      <div className="px-5 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#ff4500] text-white">
            <MessageCircle className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-xs text-muted-foreground">You're reading</p>
            <p className="text-base font-semibold text-foreground">Reddit</p>
          </div>
        </div>
      </div>
      <div className="mt-4 px-5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">LEX can help with this</p>
        <GlassCard className="space-y-2 p-3">
          <HelpRow text="Summarize the thread" />
          <HelpRow text="Extract key opinions" />
          <HelpRow text="Fact check claims" />
          <HelpRow text="Save important points" />
        </GlassCard>
      </div>
      <div className="mt-3 px-5">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Ask Lex anything</span>
        </div>
      </div>
      <div className="mt-4 px-5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Shortcuts</p>
        <div className="flex gap-3">
          {[
            { bg: "#ff4500", icon: <MessageCircle className="size-5" /> },
            { bg: "#1d6cf0", icon: <Search className="size-5" /> },
            { bg: "#ffcc00", icon: <FileText className="size-5" /> },
            { bg: "#8e8e93", icon: <Share2 className="size-5" /> },
          ].map((s, i) => (
            <span key={i} className="flex size-12 items-center justify-center rounded-2xl text-white" style={{ background: s.bg }}>
              {s.icon}
            </span>
          ))}
        </div>
      </div>
      <NavDock active="profile" showOrb />
      <HomeIndicator />
    </PhoneFrame>
  )
}

function HelpRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-accent/30 px-3 py-2">
      <Sparkles className="size-3.5 text-primary" />
      <span className="text-xs text-foreground">{text}</span>
    </div>
  )
}

/* 5. AI Chat — Lex Workspace */
export function AiChat() {
  return (
    <PhoneFrame label="AI Chat" sublabel="Not just a chat. Your command center.">
      <StatusBar />
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-1">
          <ChevronLeft className="size-4 text-muted-foreground" />
          <span className="text-base font-bold text-primary">LEX</span>
        </div>
        <Search className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-6 flex flex-col items-center">
        <Orb className="size-20" />
        <p className="mt-3 text-sm font-medium text-foreground">What would you like to do?</p>
      </div>
      <div className="mt-4 px-5">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <span className="flex-1 text-xs text-muted-foreground">Ask anything...</span>
          <Mic className="size-4 text-primary" />
        </div>
      </div>
      <div className="mt-4 px-5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Recent</p>
        <GlassCard className="space-y-2 p-3">
          <AskRow icon={<FileText className="size-3.5 text-primary" />} text="Summarize this page" />
          <AskRow icon={<Search className="size-3.5 text-primary" />} text="Open Spotify" />
          <AskRow icon={<Navigation className="size-3.5 text-primary" />} text="Navigate Home" />
        </GlassCard>
      </div>
      <div className="mt-auto flex items-center justify-around border-t border-border px-4 py-2 text-[9px] text-muted-foreground">
        <Tool icon={<Mic className="size-4" />} text="Voice" />
        <Tool icon={<Camera className="size-4" />} text="Camera" />
        <Orb className="size-9" />
        <Tool icon={<ScanLine className="size-4" />} text="Screen" />
        <Tool icon={<Folder className="size-4" />} text="Files" />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  )
}

function Tool({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  )
}
