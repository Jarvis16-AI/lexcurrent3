import {
  Phone,
  Map,
  MessageCircle,
  Camera,
  Music,
  PlayCircle,
  Mail,
  Aperture,
  Mic,
  Sun,
  Calendar,
  Navigation,
  ChevronRight,
  Search,
  Settings,
  ScanLine,
  Plus,
  Star,
  Home,
  Compass,
  User,
  Globe,
  ListChecks,
  Bell,
} from "lucide-react"
import { PhoneFrame, StatusBar, HomeIndicator, Orb, NavDock, AppIcon, GlassCard } from "./primitives"

const appRow = [
  { label: "Call", bg: "#34c759", icon: <Phone className="size-6" /> },
  { label: "Maps", bg: "#4a90e2", icon: <Map className="size-6" /> },
  { label: "Messages", bg: "#30d158", icon: <MessageCircle className="size-6" /> },
  { label: "Camera", bg: "#1c1c1e", icon: <Camera className="size-6" /> },
]
const appRow2 = [
  { label: "Music", bg: "#fa233b", icon: <Music className="size-6" /> },
  { label: "YouTube", bg: "#ff0000", icon: <PlayCircle className="size-6" /> },
  { label: "Gmail", bg: "#ea4335", icon: <Mail className="size-6" /> },
  { label: "Photos", bg: "linear-gradient(135deg,#fbbc05,#ea4335,#4285f4,#34a853)", icon: <Aperture className="size-6" /> },
]

/* 1. Good Morning — assistant home with prompt + app grid */
export function MorningHome() {
  return (
    <PhoneFrame label="Good Morning" sublabel="Assistant home">
      <StatusBar />
      <div className="flex items-start justify-between px-5 pt-4">
        <div>
          <p className="text-sm text-muted-foreground">Good Morning</p>
          <h2 className="text-2xl font-bold text-primary">LEX</h2>
          <p className="text-xs text-muted-foreground">How can I help you?</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-full border border-border bg-card">
          <User className="size-4 text-muted-foreground" />
        </div>
      </div>
      <div className="mt-3 px-5">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <span className="flex-1 text-xs text-muted-foreground">Ask Lex anything...</span>
          <Mic className="size-4 text-primary" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-y-3 px-5">
        {[...appRow, ...appRow2].map((a) => (
          <AppIcon key={a.label} label={a.label} bg={a.bg} small>
            {a.icon}
          </AppIcon>
        ))}
      </div>
      <div className="mt-4 px-5">
        <GlassCard className="p-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Suggestions for you</p>
          <Suggestion icon={<Navigation className="size-4 text-primary" />} title="Navigate to airport" sub="ETA 25 min" />
          <Suggestion icon={<Sun className="size-4 text-primary" />} title="What's the weather today?" sub="72° Sunny" />
          <Suggestion icon={<Phone className="size-4 text-primary" />} title="Call Mom" sub="Mobile" />
        </GlassCard>
      </div>
      <NavDock active="home" showOrb />
      <HomeIndicator />
    </PhoneFrame>
  )
}

function Suggestion({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {icon}
      <div className="leading-tight">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  )
}

/* 2. Home Screen — classic launcher grid + upcoming + dock */
export function HomeScreenGrid() {
  return (
    <PhoneFrame label="Home Screen" sublabel="Your personal home">
      <StatusBar />
      <div className="flex items-start justify-between px-5 pt-4">
        <div>
          <p className="text-4xl font-bold text-foreground">72°</p>
          <p className="text-xs text-muted-foreground">Sunny</p>
          <p className="text-[10px] text-muted-foreground">H 75° L 59°</p>
        </div>
        <Sun className="size-9 text-primary" />
      </div>
      <div className="mt-5 grid grid-cols-4 gap-y-4 px-5">
        {[...appRow, ...appRow2].map((a) => (
          <AppIcon key={a.label} label={a.label} bg={a.bg} small>
            {a.icon}
          </AppIcon>
        ))}
      </div>
      <div className="mt-4 px-5">
        <GlassCard className="p-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Upcoming</p>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-primary" />
              <span className="text-xs text-foreground">Team Standup</span>
            </div>
            <span className="text-[10px] text-muted-foreground">10:00 AM</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 text-primary" />
              <span className="text-xs text-foreground">Design Review</span>
            </div>
            <span className="text-[10px] text-muted-foreground">2:00 PM</span>
          </div>
        </GlassCard>
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 px-4 pb-3">
        <AppIcon bg="#34c759" small>
          <Phone className="size-5" />
        </AppIcon>
        <AppIcon bg="#30d158" small>
          <MessageCircle className="size-5" />
        </AppIcon>
        <Orb className="size-12" />
        <AppIcon bg="#1d6cf0" small>
          <Compass className="size-5" />
        </AppIcon>
        <AppIcon bg="#1c1c1e" small>
          <Camera className="size-5" />
        </AppIcon>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  )
}

/* 3. Home Option B — minimal with orb dock */
export function HomeScreenB() {
  return (
    <PhoneFrame label="Home Screen (Option B)" sublabel="With orb dock">
      <StatusBar />
      <div className="px-5 pt-5">
        <p className="text-lg font-semibold text-foreground">Good Morning</p>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-y-5 px-5">
        {[...appRow, ...appRow2].map((a) => (
          <AppIcon key={a.label} label={a.label} bg={a.bg} small>
            {a.icon}
          </AppIcon>
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <Search className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Search</span>
        </div>
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 px-4 pb-3">
        <AppIcon bg="#34c759" small>
          <Phone className="size-5" />
        </AppIcon>
        <AppIcon bg="#30d158" small>
          <MessageCircle className="size-5" />
        </AppIcon>
        <Orb className="size-12" />
        <AppIcon bg="#1d6cf0" small>
          <Globe className="size-5" />
        </AppIcon>
        <AppIcon bg="#1c1c1e" small>
          <Camera className="size-5" />
        </AppIcon>
      </div>
      <HomeIndicator />
    </PhoneFrame>
  )
}

/* 4. Good Evening — prompt-forward with quick launch */
export function GoodEvening() {
  return (
    <PhoneFrame label="Good Evening" sublabel="Prompt-forward home">
      <StatusBar />
      <div className="px-5 pt-5">
        <p className="text-sm text-muted-foreground">Good Evening</p>
        <h2 className="text-2xl font-bold text-primary">LEX</h2>
      </div>
      <div className="mt-3 px-5">
        <div className="rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-muted-foreground">What can I do for you?</span>
            <Mic className="size-4 text-primary" />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Mic className="size-3" /> Speak
            </span>
            <span className="flex items-center gap-1">
              <Camera className="size-3" /> Camera
            </span>
            <span className="flex items-center gap-1">
              <Settings className="size-3" /> Type
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 px-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium text-muted-foreground">Your day</p>
          <span className="text-[10px] text-primary">View all</span>
        </div>
        <GlassCard className="p-2">
          <DayRow icon={<Calendar className="size-3.5 text-primary" />} text="3 events today" />
          <DayRow icon={<ListChecks className="size-3.5 text-primary" />} text="5 tasks remaining" />
          <DayRow icon={<Bell className="size-3.5 text-primary" />} text="6 notifications" />
        </GlassCard>
      </div>
      <div className="mt-4 px-5">
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">Quick launch</p>
        <div className="flex justify-between">
          {appRow.map((a) => (
            <AppIcon key={a.label} label={a.label} bg={a.bg} small>
              {a.icon}
            </AppIcon>
          ))}
        </div>
      </div>
      <NavDock active="home" showOrb />
      <HomeIndicator />
    </PhoneFrame>
  )
}

function DayRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 px-1 py-1.5">
      {icon}
      <span className="text-xs text-foreground">{text}</span>
    </div>
  )
}

/* 5. At a glance — daily briefing cards */
export function AtAGlance() {
  return (
    <PhoneFrame label="At a Glance" sublabel="Daily briefing">
      <StatusBar />
      <div className="px-5 pt-4">
        <h2 className="text-xl font-bold text-primary">LEX</h2>
        <p className="mt-1 text-lg font-semibold text-foreground">At a glance</p>
        <p className="text-xs text-muted-foreground">Here's what's happening today.</p>
      </div>
      <div className="mt-3 space-y-3 px-5">
        <div className="flex items-center justify-between rounded-2xl bg-accent/60 p-3">
          <div>
            <p className="text-2xl font-bold text-foreground">72°</p>
            <p className="text-[10px] text-muted-foreground">Sunny · H 75° L 59°</p>
          </div>
          <Sun className="size-8 text-primary" />
        </div>
        <GlassCard className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              <div className="leading-tight">
                <p className="text-xs font-medium text-foreground">Team Standup</p>
                <p className="text-[10px] text-muted-foreground">10:00 – 10:30 AM</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </GlassCard>
        <GlassCard className="p-3">
          <p className="text-xs font-medium text-foreground">Sarah</p>
          <p className="text-[10px] text-muted-foreground">Hey! Are we still on for dinner tonight?</p>
        </GlassCard>
      </div>
      <NavDock active="profile" showOrb />
      <HomeIndicator />
    </PhoneFrame>
  )
}
