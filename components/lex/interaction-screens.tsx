import {
  PlayCircle,
  MessageCircle,
  Mail,
  Sparkles,
  Search,
  Clock,
  Settings,
  Info,
  Reply,
  Paperclip,
  BellOff,
  CheckCheck,
  Mic,
  Hand,
  MousePointerClick,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  ScanLine,
  Camera,
  Palette,
  AudioLines,
  Move,
  Bot,
} from "lucide-react"
import { Orb, GlassCard } from "./primitives"

/* Long Press Actions — three app context menus */
export function LongPressActions() {
  return (
    <section className="rounded-3xl border border-border bg-card/60 p-5">
      <h3 className="text-base font-semibold text-foreground">Long Press Actions</h3>
      <p className="text-xs text-muted-foreground">Powerful AI actions on any app</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <ContextMenu
          app="YouTube"
          bg="#ff0000"
          icon={<PlayCircle className="size-5" />}
          items={[
            { icon: <Sparkles className="size-3.5" />, text: "Ask Lex about this app" },
            { icon: <Sparkles className="size-3.5" />, text: "Summarize current video" },
            { icon: <Search className="size-3.5" />, text: "Find key moments" },
            { icon: <Clock className="size-3.5" />, text: "Watch later" },
            { icon: <Settings className="size-3.5" />, text: "Settings" },
          ]}
        />
        <ContextMenu
          app="WhatsApp"
          bg="#25d366"
          icon={<MessageCircle className="size-5" />}
          items={[
            { icon: <MessageCircle className="size-3.5" />, text: "Unread messages" },
            { icon: <Reply className="size-3.5" />, text: "Reply suggestions" },
            { icon: <Sparkles className="size-3.5" />, text: "Summarize chats" },
            { icon: <BellOff className="size-3.5" />, text: "Mute notifications" },
            { icon: <Info className="size-3.5" />, text: "App info" },
          ]}
        />
        <ContextMenu
          app="Gmail"
          bg="#ea4335"
          icon={<Mail className="size-5" />}
          items={[
            { icon: <Sparkles className="size-3.5" />, text: "Summarize inbox" },
            { icon: <Paperclip className="size-3.5" />, text: "Find attachments" },
            { icon: <Reply className="size-3.5" />, text: "Draft email" },
            { icon: <CheckCheck className="size-3.5" />, text: "Mark all as read" },
            { icon: <Info className="size-3.5" />, text: "App info" },
          ]}
        />
      </div>
    </section>
  )
}

function ContextMenu({
  app,
  bg,
  icon,
  items,
}: {
  app: string
  bg: string
  icon: React.ReactNode
  items: { icon: React.ReactNode; text: string }[]
}) {
  return (
    <div className="rounded-2xl border border-border bg-popover/80 p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-xl text-white" style={{ background: bg }}>
          {icon}
        </span>
        <span className="text-sm font-semibold text-foreground">{app}</span>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 rounded-lg bg-accent/30 px-2 py-1.5 text-xs font-medium text-foreground">
          <span className="text-primary">Open</span>
        </div>
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
            <span className="text-primary">{it.icon}</span>
            {it.text}
          </div>
        ))}
      </div>
    </div>
  )
}

/* Orbit Controls — radial gesture map */
export function OrbitControls() {
  return (
    <section className="rounded-3xl border border-border bg-card/60 p-5">
      <h3 className="text-base font-semibold text-foreground">Orbit Controls</h3>
      <p className="text-xs text-muted-foreground">One orb. Many actions.</p>
      <div className="relative mx-auto mt-6 aspect-square max-w-sm">
        <div className="absolute inset-6 rounded-full border border-dashed border-primary/30" />
        <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2">
          <Orb className="size-24" />
        </div>
        <GesturePin className="left-1/2 top-0 -translate-x-1/2" icon={<Mic className="size-4" />} title="Hold" sub="Voice Command" />
        <GesturePin className="bottom-2 left-1/2 -translate-x-1/2" icon={<ArrowUp className="size-4" />} title="Drag Up" sub="Voice Input" />
        <GesturePin className="left-0 top-1/3" icon={<ArrowLeft className="size-4" />} title="Drag Left" sub="Screen Analysis" />
        <GesturePin className="right-0 top-1/3" icon={<ArrowRight className="size-4" />} title="Drag Right" sub="Quick Actions" />
        <GesturePin className="bottom-10 left-2" icon={<MousePointerClick className="size-4" />} title="Tap" sub="Open Lex" />
        <GesturePin className="bottom-10 right-2" icon={<MousePointerClick className="size-4" />} title="Double Tap" sub="Last Conversation" />
      </div>
    </section>
  )
}

function GesturePin({
  className,
  icon,
  title,
  sub,
}: {
  className?: string
  icon: React.ReactNode
  title: string
  sub: string
}) {
  return (
    <div className={`absolute flex w-24 flex-col items-center text-center ${className ?? ""}`}>
      <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm">
        {icon}
      </span>
      <p className="mt-1 text-[11px] font-semibold text-foreground">{title}</p>
      <p className="text-[9px] text-muted-foreground">{sub}</p>
    </div>
  )
}

/* Orb Interactions — gesture list + customize */
export function OrbInteractions() {
  const gestures = [
    { icon: <MousePointerClick className="size-4" />, title: "Tap", sub: "Open Lex" },
    { icon: <Hand className="size-4" />, title: "Hold", sub: "Voice Command" },
    { icon: <MousePointerClick className="size-4" />, title: "Double Tap", sub: "Quick Actions" },
    { icon: <ArrowUp className="size-4" />, title: "Swipe Up", sub: "Type Prompt" },
    { icon: <ArrowLeft className="size-4" />, title: "Swipe Left", sub: "Screenshot & Ask" },
    { icon: <ArrowRight className="size-4" />, title: "Swipe Right", sub: "Camera & Ask" },
  ]
  const customize = [
    { icon: <Palette className="size-4" />, text: "Themes" },
    { icon: <AudioLines className="size-4" />, text: "Voice" },
    { icon: <Move className="size-4" />, text: "Orb Style" },
    { icon: <Hand className="size-4" />, text: "Gestures" },
    { icon: <Bot className="size-4" />, text: "Assistant Behavior" },
  ]
  return (
    <section className="rounded-3xl border border-border bg-card/60 p-5">
      <h3 className="text-base font-semibold text-foreground">Orb Interactions</h3>
      <p className="text-xs text-muted-foreground">One orb, many actions</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <GlassCard className="space-y-1">
          {gestures.map((g) => (
            <div key={g.title} className="flex items-center gap-3 py-1.5">
              <span className="text-primary">{g.icon}</span>
              <div className="leading-tight">
                <p className="text-xs font-medium text-foreground">{g.title}</p>
                <p className="text-[10px] text-muted-foreground">{g.sub}</p>
              </div>
            </div>
          ))}
        </GlassCard>
        <GlassCard>
          <p className="mb-2 text-xs font-semibold text-foreground">Customize Lex</p>
          {customize.map((c) => (
            <div key={c.text} className="flex items-center gap-3 py-2">
              <span className="text-primary">{c.icon}</span>
              <span className="text-xs text-foreground">{c.text}</span>
            </div>
          ))}
        </GlassCard>
      </div>
    </section>
  )
}

/* Ambient Intelligence — contextual help cards */
export function AmbientIntelligence() {
  return (
    <section className="rounded-3xl border border-border bg-card/60 p-5">
      <h3 className="text-base font-semibold text-foreground">Ambient Intelligence</h3>
      <p className="text-xs text-muted-foreground">Smart suggestions based on what you're doing</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <GlassCard>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#ff0000] text-white">
              <PlayCircle className="size-4" />
            </span>
            <span className="text-sm font-semibold text-foreground">You're watching YouTube</span>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">LEX can help with this</p>
          <AmbientRow icon={<Sparkles className="size-3.5" />} text="Summarize this video" />
          <AmbientRow icon={<Search className="size-3.5" />} text="Find key moments" />
          <AmbientRow icon={<Clock className="size-3.5" />} text="Save to watch later" />
          <AmbientRow icon={<Info className="size-3.5" />} text="Explain in simple terms" />
        </GlassCard>
        <GlassCard>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#1d6cf0] text-white">
              <ScanLine className="size-4" />
            </span>
            <span className="text-sm font-semibold text-foreground">You're in a meeting</span>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">LEX can help with this</p>
          <AmbientRow icon={<Reply className="size-3.5" />} text="Take notes" />
          <AmbientRow icon={<Sparkles className="size-3.5" />} text="Summarize meeting" />
          <AmbientRow icon={<CheckCheck className="size-3.5" />} text="Extract action items" />
          <AmbientRow icon={<Clock className="size-3.5" />} text="Set follow up reminders" />
        </GlassCard>
      </div>
    </section>
  )
}

function AmbientRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-primary">{icon}</span>
      <span className="text-xs text-foreground">{text}</span>
    </div>
  )
}
