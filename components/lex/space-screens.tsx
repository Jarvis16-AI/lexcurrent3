import {
  Calendar,
  MessageCircle,
  CloudRain,
  ChevronRight,
  Navigation,
  Search,
  ListChecks,
  Clock,
  Bell,
  Plus,
  Star,
  Home,
  Compass,
  User,
  Music,
  Globe,
  Mail,
  Camera,
  Building2,
  Plane,
} from "lucide-react"
import { PhoneFrame, StatusBar, HomeIndicator, Orb, NavDock, GlassCard } from "./primitives"

/* 1. LEX Space (Zero Screen) — AI assistant hub */
export function LexSpaceZero() {
  return (
    <PhoneFrame label="LEX Space (Zero Screen)" sublabel="Your AI assistant hub">
      <StatusBar />
      <div className="px-5 pt-4">
        <p className="text-sm text-muted-foreground">Good Morning</p>
        <h2 className="text-2xl font-bold text-primary">LEX</h2>
        <p className="text-xs text-muted-foreground">Here's what's happening today.</p>
      </div>
      <div className="mt-3 px-5">
        <div className="flex items-center justify-between rounded-2xl bg-accent/50 p-3">
          <div>
            <p className="text-2xl font-bold text-foreground">72°</p>
            <p className="text-[10px] text-muted-foreground">Sunny · H 75° L 59°</p>
          </div>
          <CloudRain className="size-7 text-primary" />
        </div>
      </div>
      <div className="mt-3 space-y-2 px-5">
        <InfoRow icon={<Calendar className="size-4 text-primary" />} title="3 Meetings Today" sub="10:00 · 12:00 · 4:30 PM" />
        <InfoRow icon={<MessageCircle className="size-4 text-primary" />} title="12 Unread Messages" sub="Tap to view" />
        <InfoRow icon={<CloudRain className="size-4 text-primary" />} title="Rain at 4 PM" sub="Don't forget your umbrella" />
      </div>
      <div className="mt-3 px-5">
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">Suggestions for you</p>
        <GlassCard className="space-y-1 p-3">
          <SuggRow icon={<Navigation className="size-3.5 text-primary" />} title="Navigate to work" sub="ETA 25 min" />
          <SuggRow icon={<MessageCircle className="size-3.5 text-primary" />} title="Reply to Sarah" sub="Are we still on for dinner?" />
          <SuggRow icon={<Search className="size-3.5 text-primary" />} title="Continue research" sub="Reading about AI tools" />
        </GlassCard>
      </div>
      <NavDock active="home" showOrb />
      <HomeIndicator />
    </PhoneFrame>
  )
}

function InfoRow({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card p-2.5">
      <div className="flex items-center gap-2.5">
        {icon}
        <div className="leading-tight">
          <p className="text-xs font-medium text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
      </div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </div>
  )
}

function SuggRow({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      {icon}
      <div className="leading-tight">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

/* 2. Focus Space — productivity */
export function FocusSpace() {
  return (
    <PhoneFrame label="Focus Space" sublabel="Your productivity space">
      <StatusBar />
      <div className="px-5 pt-4">
        <h2 className="text-2xl font-bold text-foreground">Focus</h2>
        <p className="mt-2 text-[11px] font-medium text-muted-foreground">Today</p>
      </div>
      <div className="mt-2 space-y-2 px-5">
        <TaskRow icon={<ListChecks className="size-4 text-primary" />} title="3 Tasks" sub="remaining" />
        <TaskRow icon={<Calendar className="size-4 text-primary" />} title="2 Meetings" sub="today" />
        <TaskRow icon={<Bell className="size-4 text-primary" />} title="6 Reminders" sub="upcoming" />
      </div>
      <div className="mt-4 px-5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Quick capture</p>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
          <span className="flex-1 text-xs text-muted-foreground">Note, idea or task...</span>
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Plus className="size-3.5" />
          </span>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between px-7 pb-2 pt-3 text-muted-foreground">
        <Star className="size-5" />
        <ListChecks className="size-5" />
        <span className="flex size-9 items-center justify-center rounded-full bg-accent text-primary">
          <Star className="size-4 fill-primary" />
        </span>
        <Home className="size-5" />
        <User className="size-5" />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  )
}

function TaskRow({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <GlassCard className="flex items-center gap-3 p-3">
      {icon}
      <div className="leading-tight">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
    </GlassCard>
  )
}

/* 3. App Drawer — smart, organized */
export function AppDrawer() {
  const suggested = [
    { label: "Spotify", bg: "#1db954", icon: <Music className="size-5" /> },
    { label: "WhatsApp", bg: "#25d366", icon: <MessageCircle className="size-5" /> },
    { label: "Chrome", bg: "#1d6cf0", icon: <Globe className="size-5" /> },
    { label: "Camera", bg: "#1c1c1e", icon: <Camera className="size-5" /> },
  ]
  return (
    <PhoneFrame label="App Drawer (Smart)" sublabel="Find apps, actions, and more">
      <StatusBar />
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="size-4 text-muted-foreground" />
          <span className="flex-1 text-xs text-muted-foreground">Search apps or ask Lex</span>
        </div>
      </div>
      <div className="mt-4 px-5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">You usually open</p>
        <div className="flex justify-between">
          {suggested.map((a) => (
            <div key={a.label} className="flex flex-col items-center gap-1">
              <span className="flex size-11 items-center justify-center rounded-2xl text-white" style={{ background: a.bg }}>
                {a.icon}
              </span>
              <span className="text-[9px] text-foreground/80">{a.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 px-5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Suggestions</p>
        <GlassCard className="space-y-2 p-3">
          <SuggRow icon={<Music className="size-3.5 text-primary" />} title="Continue Podcast" sub="Resume episode" />
          <SuggRow icon={<MessageCircle className="size-3.5 text-primary" />} title="Reply to Sarah" sub="2 unread messages" />
        </GlassCard>
      </div>
      <div className="mt-4 flex-1 overflow-hidden px-5">
        <p className="mb-1 text-[11px] font-medium text-muted-foreground">All Apps</p>
        <p className="text-[10px] font-semibold text-muted-foreground">A</p>
        <DrawerApp icon={<Building2 className="size-4 text-[#1d6cf0]" />} label="Amazon" />
        <DrawerApp icon={<Music className="size-4 text-[#fa233b]" />} label="Audible" />
        <p className="mt-1 text-[10px] font-semibold text-muted-foreground">B</p>
        <DrawerApp icon={<Building2 className="size-4 text-[#0a7d2c]" />} label="Banking" />
        <DrawerApp icon={<Plane className="size-4 text-[#003580]" />} label="Booking.com" />
      </div>
      <HomeIndicator />
    </PhoneFrame>
  )
}

function DrawerApp({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent/40">{icon}</span>
      <span className="text-xs text-foreground">{label}</span>
    </div>
  )
}
