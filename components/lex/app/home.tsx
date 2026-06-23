"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Map, MessageCircle, Camera, Music, PlayCircle, Mail,
  Wind, Droplets, Globe, Bell, Settings, MapPin,
  Phone, Wifi, WifiOff, Bluetooth, BluetoothOff,
  Navigation, NavigationOff, Volume2, VolumeX, Plus, X,
  BatteryFull, BatteryMedium, BatteryLow,
  ChevronLeft, ChevronRight, Search,
} from "lucide-react"
import Image from "next/image"
import type { AppShared } from "./types"
import { cn } from "@/lib/utils"

/* ── App deep-link helpers ────────────────────────────────────── */
function tryNativeOrWeb(nativeUrl: string, webUrl: string) {
  const iframe = document.createElement("iframe")
  iframe.style.display = "none"
  document.body.appendChild(iframe)
  iframe.src = nativeUrl
  setTimeout(() => { document.body.removeChild(iframe); window.open(webUrl, "_blank") }, 1500)
}

const DEFAULT_APPS = [
  { label: "Phone",    bg: "#34c759", icon: "phone",    url: "tel:",     deepLink: null },
  { label: "Maps",     bg: "#4a90e2", icon: "map",      url: "https://maps.google.com", deepLink: "geo:0,0" },
  { label: "WhatsApp", bg: "#25d366", icon: "msg",      url: "https://wa.me",           deepLink: "whatsapp://" },
  { label: "Camera",   bg: "#1c1c1e", icon: "camera",   url: null,                      deepLink: null },
  { label: "Music",    bg: "#fa233b", icon: "music",    url: "https://open.spotify.com",deepLink: "spotify://" },
  { label: "YouTube",  bg: "#ff0000", icon: "youtube",  url: "https://youtube.com",     deepLink: "youtube://" },
  { label: "Gmail",    bg: "#ea4335", icon: "mail",     url: "https://gmail.com",       deepLink: "googlegmail://" },
  { label: "Chrome",   bg: "#1d6cf0", icon: "globe",    url: "https://google.com",      deepLink: null },
]

const CUSTOM_APPS_KEY = "lex-home-apps-v1"
function loadHomeApps() {
  try { const raw = typeof window !== "undefined" ? localStorage.getItem(CUSTOM_APPS_KEY) : null; return raw ? JSON.parse(raw) : DEFAULT_APPS } catch { return DEFAULT_APPS }
}
function saveHomeApps(apps: typeof DEFAULT_APPS) { try { localStorage.setItem(CUSTOM_APPS_KEY, JSON.stringify(apps)) } catch {} }

function AppIconSvg({ icon, size = 18 }: { icon: string; size?: number }) {
  const cls = `size-[${size}px]`
  switch (icon) {
    case "phone":   return <Phone   className={cls} />
    case "map":     return <Map     className={cls} />
    case "msg":     return <MessageCircle className={cls} />
    case "camera":  return <Camera  className={cls} />
    case "music":   return <Music   className={cls} />
    case "youtube": return <PlayCircle className={cls} />
    case "mail":    return <Mail    className={cls} />
    default:        return <Globe   className={cls} />
  }
}

/* ═══════════════════════════════════════════════════════════════
   WIDGET SYSTEM — 30 widgets
   ═══════════════════════════════════════════════════════════════ */
type WidgetType =
  | "clock" | "timer" | "pomodoro" | "countdown" | "alarm" | "date"
  | "notes" | "todo" | "journal" | "gratitude" | "mood"
  | "breathing" | "water" | "steps" | "workout" | "habits"
  | "weather_w" | "battery_w" | "quotes" | "affirmations" | "news"
  | "calc" | "flashcard" | "bookmark" | "color" | "reading"
  | "finance" | "goals" | "crypto" | "media"

interface Widget { id: string; type: WidgetType }

type WidgetCategory = "Time" | "Personal" | "Health" | "Info" | "Tools" | "Finance"

const WIDGET_CATALOG: { type: WidgetType; label: string; icon: string; desc: string; category: WidgetCategory }[] = [
  /* Time & Productivity */
  { type: "clock",       label: "World Clock",      icon: "🕐", desc: "Local + UTC time",          category: "Time" },
  { type: "date",        label: "Date & Calendar",  icon: "📅", desc: "Today's date & week",        category: "Time" },
  { type: "timer",       label: "Stopwatch",        icon: "⏱️", desc: "Countdown / stopwatch",      category: "Time" },
  { type: "pomodoro",    label: "Pomodoro",         icon: "🍅", desc: "25/5 focus timer",           category: "Time" },
  { type: "countdown",   label: "Countdown",        icon: "⏳", desc: "Countdown to an event",      category: "Time" },
  { type: "alarm",       label: "Quick Alarm",      icon: "⏰", desc: "Set a simple alarm",         category: "Time" },
  /* Personal */
  { type: "notes",       label: "Quick Notes",      icon: "📝", desc: "Sticky note on home",        category: "Personal" },
  { type: "todo",        label: "To-Do",            icon: "✅", desc: "Quick task list",            category: "Personal" },
  { type: "journal",     label: "Micro Journal",    icon: "📖", desc: "Daily entry in one tap",     category: "Personal" },
  { type: "gratitude",   label: "Gratitude",        icon: "🙏", desc: "Daily gratitude entry",      category: "Personal" },
  { type: "mood",        label: "Mood Tracker",     icon: "😊", desc: "Log how you feel today",     category: "Personal" },
  /* Health */
  { type: "breathing",   label: "Breathing",        icon: "🌬️", desc: "4-7-8 breath exercise",     category: "Health" },
  { type: "water",       label: "Water Intake",     icon: "💧", desc: "Track daily hydration",      category: "Health" },
  { type: "steps",       label: "Step Counter",     icon: "👟", desc: "Daily step progress",        category: "Health" },
  { type: "workout",     label: "Workout Log",      icon: "💪", desc: "Quick exercise entry",       category: "Health" },
  { type: "habits",      label: "Habit Tracker",    icon: "🔁", desc: "Daily habit check-ins",      category: "Health" },
  /* Info */
  { type: "weather_w",   label: "Weather",          icon: "🌤️", desc: "Current conditions",         category: "Info" },
  { type: "battery_w",   label: "Battery Status",   icon: "🔋", desc: "Device battery level",       category: "Info" },
  { type: "quotes",      label: "Daily Quote",      icon: "💬", desc: "Rotating inspirational quote",category: "Info" },
  { type: "affirmations",label: "Affirmations",     icon: "✨", desc: "Daily positive affirmation", category: "Info" },
  { type: "news",        label: "Headlines",        icon: "📰", desc: "Top story of the moment",    category: "Info" },
  /* Tools */
  { type: "calc",        label: "Calculator",       icon: "🧮", desc: "Quick inline calculator",    category: "Tools" },
  { type: "flashcard",   label: "Flashcard",        icon: "🃏", desc: "Study a random card",        category: "Tools" },
  { type: "bookmark",    label: "Quick Links",      icon: "🔗", desc: "Saved shortcut links",       category: "Tools" },
  { type: "color",       label: "Color Picker",     icon: "🎨", desc: "Pick & copy a hex color",    category: "Tools" },
  { type: "reading",     label: "Reading List",     icon: "📚", desc: "Books & articles queue",     category: "Tools" },
  /* Finance & Goals */
  { type: "finance",     label: "Expense Tracker",  icon: "💵", desc: "Quick spending log",         category: "Finance" },
  { type: "goals",       label: "Goals",            icon: "🎯", desc: "Goal progress bars",         category: "Finance" },
  { type: "crypto",      label: "Crypto Watch",     icon: "₿",  desc: "Watch list (simulated)",     category: "Finance" },
  /* Entertainment */
  { type: "media",       label: "Now Playing",      icon: "🎵", desc: "Media controls",             category: "Finance" },
]

const WIDGETS_KEY = "lex-home-widgets-v1"
function loadWidgets(): Widget[] { try { const raw = typeof window !== "undefined" ? localStorage.getItem(WIDGETS_KEY) : null; return raw ? JSON.parse(raw) : [] } catch { return [] } }
function saveWidgets(ws: Widget[]) { try { localStorage.setItem(WIDGETS_KEY, JSON.stringify(ws)) } catch {} }

/* ── Helpers ─────────────────────────────────────────────────── */
function ls(key: string, fallback: string) { try { return localStorage.getItem(key) ?? fallback } catch { return fallback } }
function lsSet(key: string, val: string) { try { localStorage.setItem(key, val) } catch {} }
function lsJson<T>(key: string, fallback: T): T { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback } catch { return fallback } }
function lsJsonSet(key: string, val: unknown) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

/* ── TIME widgets ───────────────────────────────────────────── */
function ClockWidget() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  const utc = new Date(t.getTime() + t.getTimezoneOffset() * 60000)
  return (
    <div className="space-y-0.5">
      {[{ label: "Local", d: t }, { label: "UTC", d: utc }].map(({ label, d }) => (
        <div key={label} className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono font-semibold text-foreground tabular-nums">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      ))}
    </div>
  )
}

function DateWidget() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 60000); return () => clearInterval(id) }, [])
  const day = t.toLocaleDateString([], { weekday: "long" })
  const date = t.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })
  const week = Math.ceil(((t.getTime() - new Date(t.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)
  return (
    <div>
      <p className="text-sm font-bold text-foreground">{day}</p>
      <p className="text-[11px] text-muted-foreground">{date}</p>
      <p className="text-[10px] text-muted-foreground/70 mt-0.5">Week {week} of {t.getFullYear()}</p>
    </div>
  )
}

function TimerWidget() {
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  useEffect(() => { if (!running) return; const id = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(id) }, [running])
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0")
  const ss = String(seconds % 60).padStart(2, "0")
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-xl font-bold tabular-nums text-foreground">{mm}:{ss}</span>
      <div className="flex gap-1.5">
        <button onClick={() => setRunning(r => !r)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors">{running ? "Pause" : "Start"}</button>
        <button onClick={() => { setRunning(false); setSeconds(0) }} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-border/50 text-muted-foreground hover:bg-border transition-colors">Reset</button>
      </div>
    </div>
  )
}

function PomodoroWidget() {
  const [mode,    setMode]    = useState<"work"|"break">("work")
  const [secs,    setSecs]    = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [rounds,  setRounds]  = useState(0)
  const WORK = 25 * 60, BREAK = 5 * 60
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecs(s => {
        if (s <= 1) {
          const next = mode === "work" ? "break" : "work"
          setMode(next); setRounds(r => mode === "break" ? r + 1 : r)
          return next === "work" ? WORK : BREAK
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, mode])
  const mm = String(Math.floor(secs / 60)).padStart(2, "0")
  const ss = String(secs % 60).padStart(2, "0")
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full", mode === "work" ? "bg-primary/20 text-primary" : "bg-green-500/20 text-green-400")}>{mode === "work" ? "🍅 Focus" : "☕ Break"}</span>
        <span className="text-[10px] text-muted-foreground">{rounds} rounds</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xl font-bold tabular-nums text-foreground">{mm}:{ss}</span>
        <div className="flex gap-1.5">
          <button onClick={() => setRunning(r => !r)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary">{running ? "Pause" : "Start"}</button>
          <button onClick={() => { setRunning(false); setMode("work"); setSecs(WORK); setRounds(0) }} className="text-[11px] px-2 py-1 rounded-full bg-border/50 text-muted-foreground">↺</button>
        </div>
      </div>
    </div>
  )
}

function CountdownWidget() {
  const KEY = "lex-countdown-v1"
  const [target, setTarget] = useState<string>(() => ls(KEY, ""))
  const [label,  setLabel]  = useState<string>(() => ls(KEY + "-label", "Event"))
  const [editing, setEditing] = useState(!ls(KEY, ""))
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 1000); return () => clearInterval(id) }, [])

  const diff = target ? Math.max(0, new Date(target).getTime() - Date.now()) : 0
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)

  if (editing) return (
    <div className="space-y-1.5">
      <input defaultValue={label} onChange={e => setLabel(e.target.value)} className="w-full text-[11px] bg-background border border-border rounded-lg px-2 py-1 outline-none text-foreground" placeholder="Event name" />
      <input type="datetime-local" defaultValue={target} onChange={e => setTarget(e.target.value)} className="w-full text-[11px] bg-background border border-border rounded-lg px-2 py-1 outline-none text-foreground" />
      <button onClick={() => { lsSet(KEY, target); lsSet(KEY + "-label", label); setEditing(false) }} className="text-[11px] font-semibold px-3 py-1 rounded-full bg-primary text-primary-foreground">Save</button>
    </div>
  )
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-muted-foreground truncate">{label}</span>
        <button onClick={() => setEditing(true)} className="text-[10px] text-primary">Edit</button>
      </div>
      {diff === 0 ? <p className="text-sm font-bold text-green-400">🎉 Time's up!</p> : (
        <div className="flex gap-2 text-center">
          {[{ v: d, u: "d" }, { v: h, u: "h" }, { v: m, u: "m" }, { v: s, u: "s" }].map(({ v, u }) => (
            <div key={u} className="flex-1">
              <p className="font-mono text-lg font-bold text-foreground tabular-nums">{String(v).padStart(2,"0")}</p>
              <p className="text-[9px] text-muted-foreground">{u}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AlarmWidget() {
  const [time,   setTime]   = useState("")
  const [label,  setLabel]  = useState("")
  const [active, setActive] = useState(false)
  const [fired,  setFired]  = useState(false)
  const [, tick] = useState(0)
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 5000); return () => clearInterval(id) }, [])
  useEffect(() => {
    if (!active || !time || fired) return
    const [ah, am] = time.split(":").map(Number)
    const now = new Date(); if (now.getHours() === ah && now.getMinutes() === am) { setFired(true); setActive(false) }
  })
  return (
    <div className="space-y-1.5">
      {fired && <p className="text-sm font-bold text-yellow-400 animate-pulse">⏰ {label || "Alarm!"}</p>}
      <div className="flex gap-2">
        <input type="time" value={time} onChange={e => { setTime(e.target.value); setFired(false) }} className="flex-1 text-[11px] bg-background border border-border rounded-lg px-2 py-1 outline-none text-foreground" />
        <button onClick={() => { setActive(a => !a); setFired(false) }} className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors", active ? "bg-primary text-primary-foreground" : "bg-border/50 text-muted-foreground")}>
          {active ? "On" : "Off"}
        </button>
      </div>
      <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (optional)" className="w-full text-[11px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
    </div>
  )
}

/* ── PERSONAL widgets ────────────────────────────────────────── */
function NotesWidget() {
  const [note, setNote] = useState(() => ls("lex-widget-note", ""))
  return (
    <textarea
      value={note}
      onChange={e => { setNote(e.target.value); lsSet("lex-widget-note", e.target.value) }}
      placeholder="Type a quick note…"
      className="w-full resize-none bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground outline-none leading-relaxed"
      rows={3}
    />
  )
}

function TodoWidget() {
  const [items, setItems] = useState<{ id: string; text: string; done: boolean }[]>(() => lsJson("lex-widget-todo", []))
  const [input, setInput] = useState("")
  const save = (next: typeof items) => { setItems(next); lsJsonSet("lex-widget-todo", next) }
  return (
    <div className="space-y-1.5">
      {items.slice(0, 3).map(it => (
        <button key={it.id} onClick={() => save(items.map(i => i.id === it.id ? { ...i, done: !i.done } : i))} className="flex items-center gap-2 w-full text-left">
          <span className="text-[11px] shrink-0">{it.done ? "✅" : "⬜"}</span>
          <span className={cn("text-[11px] truncate", it.done ? "line-through text-muted-foreground" : "text-foreground")}>{it.text}</span>
        </button>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" && input.trim()) { save([...items, { id: Date.now().toString(), text: input.trim(), done: false }]); setInput("") } }}
        placeholder="Add task…" className="w-full text-[11px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
    </div>
  )
}

function JournalWidget() {
  const KEY = "lex-journal-v1"
  const today = new Date().toDateString()
  const [entry, setEntry] = useState(() => { const d = lsJson<Record<string, string>>(KEY, {}); return d[today] ?? "" })
  const save = (v: string) => { const d = lsJson<Record<string, string>>(KEY, {}); d[today] = v; lsJsonSet(KEY, d) }
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">{new Date().toLocaleDateString([], { month: "short", day: "numeric" })}</p>
      <textarea value={entry} onChange={e => { setEntry(e.target.value); save(e.target.value) }}
        placeholder="How's your day going?…" rows={3}
        className="w-full resize-none bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground outline-none leading-relaxed" />
    </div>
  )
}

function GratitudeWidget() {
  const KEY = "lex-gratitude-v1"
  const today = new Date().toDateString()
  const [items, setItems] = useState<string[]>(() => { const d = lsJson<Record<string, string[]>>(KEY, {}); return d[today] ?? [] })
  const [input, setInput] = useState("")
  const add = () => {
    if (!input.trim()) return
    const next = [...items, input.trim()].slice(0, 3)
    setItems(next); setInput("")
    const d = lsJson<Record<string, string[]>>(KEY, {}); d[today] = next; lsJsonSet(KEY, d)
  }
  return (
    <div className="space-y-1">
      {items.map((it, i) => <p key={i} className="text-[11px] text-foreground">🙏 {it}</p>)}
      {items.length < 3 && (
        <div className="flex gap-1.5">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
            placeholder="I'm grateful for…" className="flex-1 text-[11px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
          <button onClick={add} className="text-[10px] text-primary font-semibold">+ Add</button>
        </div>
      )}
      {items.length === 3 && <p className="text-[10px] text-muted-foreground">3/3 for today ✨</p>}
    </div>
  )
}

const MOODS = ["😄", "😊", "😐", "😔", "😫"]
function MoodWidget() {
  const KEY = "lex-mood-v1"
  const today = new Date().toDateString()
  const [mood, setMood] = useState<string>(() => { const d = lsJson<Record<string, string>>(KEY, {}); return d[today] ?? "" })
  const pick = (m: string) => { setMood(m); const d = lsJson<Record<string, string>>(KEY, {}); d[today] = m; lsJsonSet(KEY, d) }
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1.5">How are you feeling?</p>
      <div className="flex justify-between">
        {MOODS.map(m => (
          <button key={m} onClick={() => pick(m)} className={cn("text-2xl leading-none transition-transform", mood === m ? "scale-125" : "opacity-50 hover:opacity-80")}>{m}</button>
        ))}
      </div>
      {mood && <p className="text-[10px] text-muted-foreground mt-1 text-center">Logged for today</p>}
    </div>
  )
}

/* ── HEALTH widgets ─────────────────────────────────────────── */
const BREATH_PHASES = [
  { p: "inhale" as const, dur: 4, label: "Inhale" },
  { p: "hold"   as const, dur: 7, label: "Hold"   },
  { p: "exhale" as const, dur: 8, label: "Exhale" },
]

function BreathingWidget() {
  const [phase, setPhase] = useState<"idle"|"inhale"|"hold"|"exhale">("idle")
  const [secs,  setSecs]  = useState(0)
  const idRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = () => {
    if (idRef.current) { clearInterval(idRef.current); idRef.current = null }
    setPhase("idle"); setSecs(0)
  }

  const start = () => {
    if (idRef.current) clearInterval(idRef.current)
    let step = 0
    let s = BREATH_PHASES[0].dur
    setPhase(BREATH_PHASES[0].p); setSecs(s)
    idRef.current = setInterval(() => {
      s -= 1
      if (s <= 0) { step = (step + 1) % 3; s = BREATH_PHASES[step].dur; setPhase(BREATH_PHASES[step].p) }
      setSecs(s)
    }, 1000)
  }

  useEffect(() => () => { if (idRef.current) clearInterval(idRef.current) }, [])

  const ringSize = phase === "inhale" ? "scale-125" : phase === "exhale" ? "scale-75" : "scale-100"
  return (
    <div className="flex items-center gap-4">
      <div className={cn("size-12 rounded-full border-2 border-primary transition-transform duration-1000", ringSize, phase !== "idle" ? "bg-primary/20" : "bg-transparent")} />
      <div className="flex-1">
        {phase === "idle"
          ? <button onClick={start} className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-primary/20 text-primary">Start 4-7-8</button>
          : <div>
              <p className="text-sm font-bold text-foreground">{BREATH_PHASES.find(p => p.p === phase)?.label}</p>
              <p className="text-[11px] text-muted-foreground">{secs}s</p>
              <button onClick={stop} className="text-[10px] text-muted-foreground hover:text-foreground mt-0.5">Stop</button>
            </div>
        }
      </div>
    </div>
  )
}

function WaterWidget() {
  const KEY = "lex-water-v1"
  const today = new Date().toDateString()
  const [glasses, setGlasses] = useState(() => { const d = lsJson<Record<string, number>>(KEY, {}); return d[today] ?? 0 })
  const GOAL = 8
  const add = () => { const next = Math.min(glasses + 1, GOAL); setGlasses(next); const d = lsJson<Record<string, number>>(KEY, {}); d[today] = next; lsJsonSet(KEY, d) }
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] text-muted-foreground">{glasses}/{GOAL} glasses today</p>
        <button onClick={add} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">+ Glass</button>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: GOAL }).map((_, i) => (
          <span key={i} className={cn("text-base", i < glasses ? "opacity-100" : "opacity-20")}>💧</span>
        ))}
      </div>
    </div>
  )
}

function StepsWidget() {
  const [steps, setSteps] = useState<number | null>(null)
  const [perm,  setPerm]  = useState<"unknown"|"granted"|"denied">("unknown")
  useEffect(() => {
    if (typeof window === "undefined") return
    if ("ActivityDetector" in window || (window as any).DeviceMotionEvent) setPerm("granted")
  }, [])
  const KEY = "lex-steps-v1"
  const today = new Date().toDateString()
  const [manual, setManual] = useState(() => { const d = lsJson<Record<string, number>>(KEY, {}); return d[today] ?? 0 })
  const GOAL = 10000
  const pct = Math.min(100, Math.round((manual / GOAL) * 100))
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xl font-bold text-foreground">{manual.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">Goal: {GOAL.toLocaleString()}</p>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden mb-1.5">
        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-1.5">
        {[500, 1000, 2000].map(n => (
          <button key={n} onClick={() => { const next = manual + n; setManual(next); const d = lsJson<Record<string, number>>(KEY, {}); d[today] = next; lsJsonSet(KEY, d) }}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-border/50 text-muted-foreground hover:bg-border">+{n}</button>
        ))}
      </div>
    </div>
  )
}

function WorkoutWidget() {
  const KEY = "lex-workout-v1"
  const today = new Date().toDateString()
  const [log, setLog] = useState<string[]>(() => { const d = lsJson<Record<string, string[]>>(KEY, {}); return d[today] ?? [] })
  const [input, setInput] = useState("")
  const add = () => {
    if (!input.trim()) return
    const next = [...log, input.trim()]
    setLog(next); setInput("")
    const d = lsJson<Record<string, string[]>>(KEY, {}); d[today] = next; lsJsonSet(KEY, d)
  }
  return (
    <div className="space-y-1.5">
      {log.slice(-3).map((e, i) => <p key={i} className="text-[11px] text-foreground">💪 {e}</p>)}
      <div className="flex gap-1.5">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="e.g. 20 push-ups" className="flex-1 text-[11px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
        <button onClick={add} className="text-[10px] text-primary font-semibold">Log</button>
      </div>
    </div>
  )
}

function HabitsWidget() {
  const KEY = "lex-habits-v1"
  const today = new Date().toDateString()
  const [habits, setHabits] = useState<{ id: string; name: string }[]>(() => lsJson(KEY + "-list", [
    { id: "1", name: "Meditate" }, { id: "2", name: "Exercise" }, { id: "3", name: "Read" },
  ]))
  const [done, setDone] = useState<string[]>(() => { const d = lsJson<Record<string, string[]>>(KEY + "-done", {}); return d[today] ?? [] })
  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter(x => x !== id) : [...done, id]
    setDone(next); const d = lsJson<Record<string, string[]>>(KEY + "-done", {}); d[today] = next; lsJsonSet(KEY + "-done", d)
  }
  return (
    <div className="space-y-1.5">
      {habits.map(h => (
        <button key={h.id} onClick={() => toggle(h.id)} className="flex items-center gap-2 w-full text-left">
          <span className="text-[11px] shrink-0">{done.includes(h.id) ? "✅" : "⬜"}</span>
          <span className={cn("text-[11px]", done.includes(h.id) ? "line-through text-muted-foreground" : "text-foreground")}>{h.name}</span>
        </button>
      ))}
      <p className="text-[10px] text-muted-foreground">{done.length}/{habits.length} today</p>
    </div>
  )
}

/* ── INFO widgets ────────────────────────────────────────────── */
function WeatherWidget({ weather }: { weather: any }) {
  if (!weather) return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <div className="size-5 rounded-full border-2 border-muted-foreground/30 border-t-primary animate-spin" />
      <p className="text-[11px]">Fetching weather…</p>
    </div>
  )
  if (weather.error) return (
    <p className="text-[11px] text-muted-foreground">⚠️ Weather unavailable — tap to retry</p>
  )
  const forecast: Array<{ date: string; high: number; low: number; icon: string }> = weather.forecast ?? []
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
  return (
    <div className="space-y-2">
      {/* Main temp row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground leading-none">{weather.temp}{weather.unit}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{weather.label}</p>
          <p className="text-[10px] text-muted-foreground/70">{weather.city}{weather.country ? `, ${weather.country}` : ""}</p>
        </div>
        <span className="text-4xl drop-shadow-sm">{weather.icon}</span>
      </div>
      {/* Stats row */}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span>↑{weather.high}{weather.unit}</span>
        <span>↓{weather.low}{weather.unit}</span>
        <span>💧{weather.humidity}%</span>
        <span>💨{weather.wind}{weather.windUnit ?? "km/h"}</span>
      </div>
      {/* 3-day forecast strip */}
      {forecast.length > 1 && (
        <div className="flex gap-1 pt-1 border-t border-border/30">
          {forecast.slice(0, 3).map((f, i) => {
            const d = new Date(f.date)
            const label = i === 0 ? "Today" : days[d.getDay()]
            return (
              <div key={f.date} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[9px] text-muted-foreground">{label}</span>
                <span className="text-sm">{f.icon}</span>
                <span className="text-[9px] font-semibold text-foreground">{f.high}°</span>
                <span className="text-[9px] text-muted-foreground">{f.low}°</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BatteryWidget() {
  const [level,    setLevel]    = useState<number | null>(null)
  const [charging, setCharging] = useState(false)
  useEffect(() => {
    if (!("getBattery" in navigator)) return
    ;(navigator as any).getBattery().then((bat: any) => {
      setLevel(Math.round(bat.level * 100)); setCharging(bat.charging)
      bat.addEventListener("levelchange",    () => setLevel(Math.round(bat.level * 100)))
      bat.addEventListener("chargingchange", () => setCharging(bat.charging))
    }).catch(() => {})
  }, [])
  const pct = level ?? null
  const Icon = pct !== null ? (pct > 60 ? BatteryFull : pct > 25 ? BatteryMedium : BatteryLow) : BatteryFull
  const color = pct === null ? "text-muted-foreground" : pct > 20 ? "text-green-400" : "text-red-400"
  return (
    <div className="flex items-center gap-3">
      <Icon className={cn("size-8", color)} />
      <div>
        <p className="text-xl font-bold text-foreground">{pct !== null ? `${pct}%` : "—"}</p>
        <p className="text-[11px] text-muted-foreground">{charging ? "⚡ Charging" : pct === null ? "Not available" : pct > 80 ? "Fully charged" : pct > 20 ? "Battery OK" : "Low battery"}</p>
      </div>
    </div>
  )
}

const QUOTES = [
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "You don't have to be great to start, but you have to start to be great.",
  "Small daily improvements are the key to staggering long-term results.",
  "It always seems impossible until it's done. — Nelson Mandela",
  "The only way to do great work is to love what you do. — Steve Jobs",
  "In the middle of difficulty lies opportunity. — Albert Einstein",
  "Success is not final, failure is not fatal. — Winston Churchill",
  "Believe you can and you're halfway there. — Theodore Roosevelt",
]
function QuotesWidget() {
  const [idx, setIdx] = useState(() => Math.floor(Date.now() / 86400000) % QUOTES.length)
  return (
    <div>
      <p className="text-[11px] leading-relaxed text-foreground italic">"{QUOTES[idx]}"</p>
      <button onClick={() => setIdx(i => (i + 1) % QUOTES.length)} className="mt-1 text-[10px] text-primary hover:text-primary/80">Next →</button>
    </div>
  )
}

const AFFIRMATIONS = [
  "I am capable of achieving anything I set my mind to.",
  "I radiate confidence, self-respect, and inner harmony.",
  "Every day I grow stronger and more resilient.",
  "I have the power to create positive change in my life.",
  "I am worthy of good things happening to me.",
  "My potential is limitless — I embrace challenges.",
  "I am at peace with who I am and excited about who I'm becoming.",
  "Good things are coming my way today.",
]
function AffirmationsWidget() {
  const [idx, setIdx] = useState(() => Math.floor(Date.now() / 86400000) % AFFIRMATIONS.length)
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] leading-relaxed text-foreground font-medium">{AFFIRMATIONS[idx]}</p>
      <button onClick={() => setIdx(i => (i + 1) % AFFIRMATIONS.length)} className="text-[10px] text-primary">New affirmation →</button>
    </div>
  )
}

const HEADLINES = [
  "AI assistants are now embedded in everyday mobile experiences",
  "Researchers discover new approach to on-device language models",
  "Productivity apps see surge as people optimize daily routines",
  "Health tracking tech helps users build sustainable habits",
  "The future of personalized AI is here — and it's on your phone",
]
function NewsWidget() {
  const [idx, setIdx] = useState(0)
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">📰 Top Story</p>
      <p className="text-[11px] font-medium text-foreground leading-snug">{HEADLINES[idx]}</p>
      <button onClick={() => setIdx(i => (i + 1) % HEADLINES.length)} className="mt-1 text-[10px] text-primary">Next →</button>
    </div>
  )
}

/* ── TOOLS widgets ───────────────────────────────────────────── */
function CalcWidget() {
  const [expr,   setExpr]   = useState("")
  const [result, setResult] = useState("")
  const calc = () => {
    try {
      // safe eval via Function
      const r = Function(`"use strict"; return (${expr.replace(/[^0-9+\-*/.() %]/g, "")})`)()
      setResult(String(r))
    } catch { setResult("Error") }
  }
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <input value={expr} onChange={e => setExpr(e.target.value)} onKeyDown={e => e.key === "Enter" && calc()}
          placeholder="2 + 2 * 10…" className="flex-1 text-[11px] bg-background border border-border rounded-lg px-2 py-1 outline-none text-foreground font-mono" />
        <button onClick={calc} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-primary/20 text-primary">=</button>
      </div>
      {result && <p className="text-xl font-bold text-primary font-mono">{result}</p>}
    </div>
  )
}

function FlashcardWidget() {
  const DEFAULT_CARDS = [
    { q: "What is the capital of France?", a: "Paris" },
    { q: "What does HTTP stand for?", a: "HyperText Transfer Protocol" },
    { q: "Who wrote Romeo and Juliet?", a: "William Shakespeare" },
    { q: "What is 7 × 8?", a: "56" },
    { q: "What planet is closest to the Sun?", a: "Mercury" },
  ]
  const [idx,     setIdx]     = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = DEFAULT_CARDS[idx]
  return (
    <div>
      <button onClick={() => setFlipped(f => !f)}
        className={cn("w-full rounded-xl border p-3 text-center transition-all min-h-[60px] flex items-center justify-center",
          flipped ? "border-primary/40 bg-primary/10" : "border-border bg-background/60")}>
        <p className="text-[11px] font-medium text-foreground leading-snug">{flipped ? card.a : card.q}</p>
      </button>
      <div className="flex items-center justify-between mt-1.5">
        <p className="text-[10px] text-muted-foreground">{flipped ? "Answer" : "Question"} — tap to flip</p>
        <button onClick={() => { setFlipped(false); setIdx(i => (i + 1) % DEFAULT_CARDS.length) }} className="text-[10px] text-primary">Next →</button>
      </div>
    </div>
  )
}

function BookmarkWidget() {
  const KEY = "lex-bookmarks-v1"
  const [links, setLinks] = useState<{ title: string; url: string }[]>(() => lsJson(KEY, [
    { title: "Google", url: "https://google.com" },
    { title: "GitHub", url: "https://github.com" },
  ]))
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newUrl,   setNewUrl]   = useState("")
  return (
    <div className="space-y-1">
      {links.slice(0, 4).map((l, i) => (
        <a key={i} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[11px] text-primary hover:underline truncate">
          🔗 {l.title}
        </a>
      ))}
      {adding ? (
        <div className="space-y-1">
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title" className="w-full text-[11px] bg-background border border-border rounded px-2 py-0.5 outline-none text-foreground" />
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://…" className="w-full text-[11px] bg-background border border-border rounded px-2 py-0.5 outline-none text-foreground" />
          <div className="flex gap-1.5">
            <button onClick={() => { if (newTitle && newUrl) { const next = [...links, { title: newTitle, url: newUrl }]; setLinks(next); lsJsonSet(KEY, next); setNewTitle(""); setNewUrl(""); setAdding(false) } }} className="text-[10px] text-primary font-semibold">Save</button>
            <button onClick={() => setAdding(false)} className="text-[10px] text-muted-foreground">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-[10px] text-primary">+ Add link</button>
      )}
    </div>
  )
}

function ColorWidget() {
  const [color, setColor] = useState("#f97316")
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(color).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div className="flex items-center gap-3">
      <input type="color" value={color} onChange={e => setColor(e.target.value)} className="size-12 rounded-xl cursor-pointer border-0 p-0 bg-transparent" />
      <div className="flex-1">
        <p className="text-sm font-mono font-bold text-foreground">{color.toUpperCase()}</p>
        <button onClick={copy} className="text-[10px] text-primary hover:text-primary/80">{copied ? "Copied!" : "Copy hex"}</button>
      </div>
    </div>
  )
}

function ReadingWidget() {
  const KEY = "lex-reading-v1"
  const [books, setBooks] = useState<{ id: string; title: string; done: boolean }[]>(() => lsJson(KEY, []))
  const [input, setInput] = useState("")
  const add = () => {
    if (!input.trim()) return
    const next = [...books, { id: Date.now().toString(), title: input.trim(), done: false }]
    setBooks(next); lsJsonSet(KEY, next); setInput("")
  }
  const toggle = (id: string) => { const next = books.map(b => b.id === id ? { ...b, done: !b.done } : b); setBooks(next); lsJsonSet(KEY, next) }
  return (
    <div className="space-y-1.5">
      {books.slice(-3).map(b => (
        <button key={b.id} onClick={() => toggle(b.id)} className="flex items-center gap-2 w-full text-left">
          <span className="text-[11px] shrink-0">{b.done ? "📗" : "📖"}</span>
          <span className={cn("text-[11px] truncate", b.done ? "line-through text-muted-foreground" : "text-foreground")}>{b.title}</span>
        </button>
      ))}
      <div className="flex gap-1.5">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Add book or article…" className="flex-1 text-[11px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
        <button onClick={add} className="text-[10px] text-primary font-semibold">Add</button>
      </div>
    </div>
  )
}

/* ── FINANCE & GOALS widgets ─────────────────────────────────── */
function FinanceWidget() {
  const KEY = "lex-expenses-v1"
  const today = new Date().toDateString()
  const [expenses, setExpenses] = useState<{ label: string; amount: number }[]>(() => { const d = lsJson<Record<string, typeof expenses>>(KEY, {}); return d[today] ?? [] })
  const [label, setLabel] = useState("")
  const [amt, setAmt] = useState("")
  const save = (next: typeof expenses) => { setExpenses(next); const d = lsJson<Record<string, typeof expenses>>(KEY, {}); d[today] = next; lsJsonSet(KEY, d) }
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  return (
    <div className="space-y-1.5">
      {expenses.slice(-2).map((e, i) => (
        <div key={i} className="flex justify-between text-[11px]">
          <span className="text-foreground truncate">{e.label}</span>
          <span className="text-muted-foreground shrink-0">${e.amount.toFixed(2)}</span>
        </div>
      ))}
      {expenses.length > 0 && <div className="flex justify-between text-[11px] font-semibold border-t border-border/40 pt-1"><span>Total today</span><span className="text-primary">${total.toFixed(2)}</span></div>}
      <div className="flex gap-1">
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Item" className="flex-1 text-[11px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground min-w-0" />
        <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="$0" className="w-14 text-[11px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
        <button onClick={() => { if (label && amt) { save([...expenses, { label, amount: parseFloat(amt) || 0 }]); setLabel(""); setAmt("") } }} className="text-[10px] text-primary font-semibold">Add</button>
      </div>
    </div>
  )
}

function GoalsWidget() {
  const KEY = "lex-goals-widget-v1"
  const [goals, setGoals] = useState<{ id: string; title: string; pct: number }[]>(() => lsJson(KEY, [
    { id: "1", title: "Read 24 books", pct: 35 },
    { id: "2", title: "Exercise daily", pct: 60 },
  ]))
  return (
    <div className="space-y-2">
      {goals.map(g => (
        <div key={g.id}>
          <div className="flex justify-between text-[11px] mb-0.5">
            <span className="text-foreground truncate max-w-[75%]">{g.title}</span>
            <span className="text-muted-foreground">{g.pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${g.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

const CRYPTO_DATA = [
  { symbol: "BTC", name: "Bitcoin",  price: "~$67,420", change: "+2.4%" },
  { symbol: "ETH", name: "Ethereum", price: "~$3,580",  change: "+1.8%" },
  { symbol: "SOL", name: "Solana",   price: "~$175",    change: "+5.1%" },
]
function CryptoWidget() {
  const [watched, setWatched] = useState(["BTC", "ETH"])
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Simulated prices</p>
      {CRYPTO_DATA.filter(c => watched.includes(c.symbol)).map(c => (
        <div key={c.symbol} className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-foreground">{c.symbol}</span>
            <span className="text-[10px] text-muted-foreground ml-1">{c.name}</span>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-mono text-foreground">{c.price}</p>
            <p className="text-[10px] text-green-400">{c.change}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function MediaWidget() {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl">🎵</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground truncate">No media playing</p>
        <p className="text-[10px] text-muted-foreground">Open Music app to control</p>
      </div>
    </div>
  )
}

/* ── Widget card shell ───────────────────────────────────────── */
function WidgetCard({ widget, onRemove, weather }: { widget: Widget; onRemove: () => void; weather: any }) {
  const meta = WIDGET_CATALOG.find(w => w.type === widget.type)!
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur px-3 py-2.5 relative group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{meta.icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{meta.label}</span>
        </div>
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 flex size-4 items-center justify-center rounded-full bg-foreground/10 text-foreground/60 hover:bg-red-500/20 hover:text-red-400 transition-all">
          <X className="size-2.5" />
        </button>
      </div>
      {widget.type === "clock"        && <ClockWidget />}
      {widget.type === "date"         && <DateWidget />}
      {widget.type === "timer"        && <TimerWidget />}
      {widget.type === "pomodoro"     && <PomodoroWidget />}
      {widget.type === "countdown"    && <CountdownWidget />}
      {widget.type === "alarm"        && <AlarmWidget />}
      {widget.type === "notes"        && <NotesWidget />}
      {widget.type === "todo"         && <TodoWidget />}
      {widget.type === "journal"      && <JournalWidget />}
      {widget.type === "gratitude"    && <GratitudeWidget />}
      {widget.type === "mood"         && <MoodWidget />}
      {widget.type === "breathing"    && <BreathingWidget />}
      {widget.type === "water"        && <WaterWidget />}
      {widget.type === "steps"        && <StepsWidget />}
      {widget.type === "workout"      && <WorkoutWidget />}
      {widget.type === "habits"       && <HabitsWidget />}
      {widget.type === "weather_w"    && <WeatherWidget weather={weather} />}
      {widget.type === "battery_w"    && <BatteryWidget />}
      {widget.type === "quotes"       && <QuotesWidget />}
      {widget.type === "affirmations" && <AffirmationsWidget />}
      {widget.type === "news"         && <NewsWidget />}
      {widget.type === "calc"         && <CalcWidget />}
      {widget.type === "flashcard"    && <FlashcardWidget />}
      {widget.type === "bookmark"     && <BookmarkWidget />}
      {widget.type === "color"        && <ColorWidget />}
      {widget.type === "reading"      && <ReadingWidget />}
      {widget.type === "finance"      && <FinanceWidget />}
      {widget.type === "goals"        && <GoalsWidget />}
      {widget.type === "crypto"       && <CryptoWidget />}
      {widget.type === "media"        && <MediaWidget />}
    </div>
  )
}

/* ── Widget picker with category tabs ───────────────────────── */
const CATEGORIES: WidgetCategory[] = ["Time", "Personal", "Health", "Info", "Tools", "Finance"]

function WidgetPicker({
  widgets, onAdd, onClose,
}: { widgets: Widget[]; onAdd: (t: WidgetType) => void; onClose: () => void }) {
  const [cat, setCat] = useState<WidgetCategory>("Time")
  const [q, setQ]     = useState("")
  const filtered = WIDGET_CATALOG.filter(w =>
    (q ? w.label.toLowerCase().includes(q.toLowerCase()) || w.desc.toLowerCase().includes(q.toLowerCase()) : w.category === cat)
  )
  return (
    <div className="rounded-2xl border border-border bg-card/95 backdrop-blur overflow-hidden shadow-xl">
      {/* header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-border/40">
        <p className="text-xs font-bold text-foreground">Add Widget</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
      </div>
      {/* search */}
      <div className="px-3 pt-2 pb-1.5">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5">
          <Search className="size-3.5 text-muted-foreground shrink-0" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search widgets…" className="flex-1 text-[11px] bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
        </div>
      </div>
      {/* category pills */}
      {!q && (
        <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} className={cn("shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors",
              cat === c ? "bg-primary text-primary-foreground" : "bg-border/50 text-muted-foreground hover:bg-border")}>
              {c}
            </button>
          ))}
        </div>
      )}
      {/* widget list */}
      <div className="max-h-52 overflow-y-auto">
        {filtered.map(w => {
          const added = widgets.some(x => x.type === w.type)
          return (
            <button key={w.type} disabled={added} onClick={() => onAdd(w.type)}
              className={cn("flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-border/30 last:border-0",
                added ? "opacity-40 cursor-not-allowed" : "hover:bg-accent/60 active:bg-accent")}>
              <span className="text-base shrink-0">{w.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-foreground">{w.label}</p>
                <p className="text-[10px] text-muted-foreground">{w.desc}</p>
              </div>
              {added
                ? <span className="text-[10px] text-muted-foreground shrink-0">✓</span>
                : <Plus className="size-3.5 text-muted-foreground shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Network info hook ───────────────────────────────────────── */
interface NetInfo { label: string | null; bars: number; wifi: boolean }
function useNetworkInfo(): NetInfo {
  const [info, setInfo] = useState<NetInfo>({ label: null, bars: 4, wifi: false })
  useEffect(() => {
    function read() {
      const conn = (navigator as any).connection
      if (!conn) { setInfo({ label: null, bars: 4, wifi: false }); return }
      const type = conn.type ?? "", eff = conn.effectiveType ?? "4g", dl = conn.downlink ?? 10
      if (type === "wifi" || type === "ethernet") { setInfo({ label: null, bars: dl > 5 ? 4 : dl > 2 ? 3 : dl > 0.5 ? 2 : 1, wifi: true }) }
      else if (type === "none") { setInfo({ label: null, bars: 0, wifi: false }) }
      else {
        const label = eff === "4g" ? "4G" : eff === "3g" ? "3G" : eff === "2g" ? "2G" : eff === "slow-2g" ? "E" : null
        setInfo({ label, bars: eff === "4g" ? 4 : eff === "3g" ? 3 : eff === "2g" ? 2 : eff === "slow-2g" ? 1 : 0, wifi: false })
      }
    }
    read()
    const conn = (navigator as any).connection
    conn?.addEventListener?.("change", read)
    return () => conn?.removeEventListener?.("change", read)
  }, [])
  return info
}

function SignalBars({ bars }: { bars: number }) {
  return (
    <svg viewBox="0 0 16 12" className="size-[13px] fill-current">
      {[3, 6, 9, 12].map((h, i) => (
        <rect key={i} x={i * 4.5} y={12 - h} width={3} height={h} rx={1} className={i < bars ? undefined : "opacity-20"} />
      ))}
    </svg>
  )
}

function BatteryStatusIcon({ showPercent }: { showPercent?: boolean }) {
  const [level, setLevel]     = useState<number | null>(null)
  const [charging, setCharging] = useState(false)
  useEffect(() => {
    if (!("getBattery" in navigator)) return
    ;(navigator as any).getBattery().then((bat: any) => {
      setLevel(Math.round(bat.level * 100)); setCharging(bat.charging)
      bat.addEventListener("levelchange",    () => setLevel(Math.round(bat.level * 100)))
      bat.addEventListener("chargingchange", () => setCharging(bat.charging))
    }).catch(() => {})
  }, [])
  const pct = level ?? 80
  const fillWidth = Math.max(1, Math.round((pct / 100) * 17))
  const color = pct > 20 ? "currentColor" : "#ef4444"
  return (
    <div className="flex items-center gap-0.5">
      {charging && <span className="text-[9px] text-yellow-400">⚡</span>}
      {showPercent && <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>{pct}%</span>}
      <svg viewBox="0 0 25 12" className="size-[18px]" style={{ fill: color }}>
        <rect x="0" y="0" width="22" height="12" rx="2.5" style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.5, opacity: 0.5 }} />
        <rect x="1" y="1" width={fillWidth} height="10" rx="1.5" />
        <rect x="23" y="3.5" width="2" height="5" rx="1" style={{ opacity: 0.6 }} />
      </svg>
    </div>
  )
}

function QuickTile({ on, label, iconOn, iconOff, color, onToggle }: {
  on: boolean; label: string; iconOn: React.ReactNode; iconOff: React.ReactNode; color: string; onToggle: () => void
}) {
  return (
    <button onClick={onToggle} className={cn("flex flex-col items-center gap-1 rounded-2xl py-2.5 px-1 transition-all active:scale-90 flex-1", on ? "text-white shadow-lg" : "bg-white/8 text-muted-foreground border border-border/40")} style={on ? { background: color } : undefined}>
      <span className="size-5 flex items-center justify-center">{on ? iconOn : iconOff}</span>
      <span className="text-[9px] font-semibold leading-none tracking-tight">{label}</span>
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   HOME SCREEN
   ═══════════════════════════════════════════════════════════════ */
export function HomeScreen({
  time, weather, sendMessage,
  onNotifications, onSettings, onWeatherSearch, showBatteryPercent,
}: AppShared & {
  onNotifications?: () => void
  onSettings?: () => void
  onWeatherSearch?: () => void
  showBatteryPercent?: boolean
}) {
  const t    = time ?? new Date()
  const hour = t.getHours()
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : hour < 21 ? "Good Evening" : "Good Night"
  const fmtTime = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
  const fmtDate = time ? time.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : ""
  const net = useNetworkInfo()

  const [wifi,      setWifi]      = useState(true)
  const [bluetooth, setBluetooth] = useState(false)
  const [location,  setLocation]  = useState(true)
  const [silent,    setSilent]    = useState(false)
  const [apps,      setApps]      = useState(() => loadHomeApps())
  const [manageMode,setManage]    = useState(false)
  const [widgets,   setWidgets]   = useState<Widget[]>(() => loadWidgets())
  const [showPicker,setShowPicker]= useState(false)

  const addWidget = (type: WidgetType) => {
    if (widgets.some(w => w.type === type)) return
    const next = [...widgets, { id: Date.now().toString(), type }]
    setWidgets(next); saveWidgets(next); setShowPicker(false)
  }
  const removeWidget = (id: string) => { const next = widgets.filter(w => w.id !== id); setWidgets(next); saveWidgets(next) }

  useEffect(() => {
    navigator.permissions?.query({ name: "geolocation" as PermissionName }).then(r => setLocation(r.state === "granted")).catch(() => {})
  }, [])

  function removeApp(label: string) { const next = apps.filter((a: any) => a.label !== label); setApps(next); saveHomeApps(next) }
  function openApp(app: any) {
    if (!app.url) return
    if (app.url === "tel:") { window.location.href = app.url; return }
    if (app.deepLink) tryNativeOrWeb(app.deepLink, app.url)
    else window.open(app.url, "_blank")
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0 text-foreground">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tabular-nums leading-none">{fmtTime}</span>
          <button onClick={onNotifications} className="active:scale-90 transition-transform"><Bell className="size-[14px]" /></button>
          <button onClick={onSettings} className="active:scale-90 transition-transform"><Settings className="size-[14px]" /></button>
        </div>
        <div className="flex items-center gap-1.5">
          {net.label && <span className="text-[11px] font-semibold">{net.label}</span>}
          {net.wifi ? <Wifi className="size-[13px]" /> : <SignalBars bars={net.bars} />}
          <BatteryStatusIcon showPercent={showBatteryPercent} />
        </div>
      </div>

      {/* Greeting */}
      <div className="px-4 pt-0.5 pb-2 shrink-0">
        <p className="text-sm font-semibold text-foreground">{greeting}</p>
        <p className="text-[10px] text-muted-foreground">{fmtDate}</p>
      </div>

      {/* Quick toggles */}
      <div className="mx-4 mb-3 shrink-0">
        <div className="flex gap-2 rounded-2xl bg-card/50 p-2 border border-border/30 backdrop-blur-sm">
          <QuickTile on={wifi} label="Wi-Fi" iconOn={<Wifi className="size-5" />} iconOff={<WifiOff className="size-5" />} color="#0a84ff" onToggle={() => setWifi(v => !v)} />
          <QuickTile on={bluetooth} label="Bluetooth" iconOn={<Bluetooth className="size-5" />} iconOff={<BluetoothOff className="size-5" />} color="#0a84ff" onToggle={() => setBluetooth(v => !v)} />
          <QuickTile on={location} label="Location" iconOn={<Navigation className="size-5" />} iconOff={<NavigationOff className="size-5" />} color="#30d158" onToggle={() => setLocation(v => !v)} />
          <QuickTile on={silent} label={silent ? "Silent" : "Sound"} iconOn={<VolumeX className="size-5" />} iconOff={<Volume2 className="size-5" />} color="#636366" onToggle={() => setSilent(v => !v)} />
        </div>
      </div>

      {/* Weather card */}
      <div className="mx-4 mb-3 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-accent/70 to-accent/30 px-4 py-2.5 shadow-sm">
        {weather ? (
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-end gap-1.5">
                <span className="text-3xl font-bold leading-none text-foreground">{weather.temp}{weather.unit}</span>
                <span className="mb-0.5 text-xs text-muted-foreground">{weather.label}</span>
              </div>
              <button onClick={onWeatherSearch} className="mt-0.5 flex items-center gap-1 group">
                <MapPin className="size-3 text-primary shrink-0" />
                <p className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors truncate">H {weather.high}° · L {weather.low}° · {weather.city}</p>
              </button>
              <div className="mt-1 flex gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><Droplets className="size-3 text-primary" />{weather.humidity}%</span>
                <span className="flex items-center gap-1"><Wind className="size-3 text-primary" />{weather.wind} km/h</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 ml-2">
              <span className="text-4xl leading-none">{weather.icon}</span>
              <button onClick={onWeatherSearch} className="text-[10px] text-primary/70 hover:text-primary transition-colors font-medium">Change</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between animate-pulse">
            <div className="space-y-1.5">
              <div className="h-8 w-20 rounded-xl bg-border/50" /><div className="h-2 w-28 rounded bg-border/50" />
            </div>
            <Wind className="size-8 text-primary/15" />
          </div>
        )}
      </div>

      {/* App grid */}
      <div className="mx-4 mb-2 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Apps</p>
          <button onClick={() => setManage(m => !m)} className={cn("text-[10px] font-medium transition-colors px-2 py-0.5 rounded-full", manageMode ? "bg-primary text-primary-foreground" : "text-primary hover:text-primary/80")}>
            {manageMode ? "Done" : "Manage"}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-x-1 gap-y-2">
          {apps.map((app: any) => (
            <div key={app.label} className="relative flex flex-col items-center gap-1 group">
              <button onClick={() => !manageMode && openApp(app)} className="flex flex-col items-center gap-1">
                <span className={cn("flex size-[48px] items-center justify-center rounded-[16px] text-white shadow transition-all duration-150", manageMode ? "animate-[wiggle_0.3s_ease-in-out_infinite]" : "group-active:scale-90")} style={{ background: app.bg }}>
                  <AppIconSvg icon={app.icon} size={16} />
                </span>
                <span className="text-[9px] font-medium text-foreground/75 truncate max-w-[52px] text-center">{app.label}</span>
              </button>
              {manageMode && (
                <button onClick={() => removeApp(app.label)} className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-foreground text-background shadow-sm z-10">
                  <X className="size-2.5" />
                </button>
              )}
            </div>
          ))}
          {manageMode && (
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => {
                const label = prompt("App name:"); const url = prompt("App URL:")
                if (!label) return
                const next = [...apps, { label, bg: "#555", icon: "globe", url: url || null, deepLink: null }]
                setApps(next); saveHomeApps(next)
              }} className="flex size-[48px] items-center justify-center rounded-[16px] border-2 border-dashed border-border bg-accent/20 text-muted-foreground hover:bg-accent/40 transition-colors">
                <Plus className="size-5" />
              </button>
              <span className="text-[9px] font-medium text-muted-foreground">Add</span>
            </div>
          )}
        </div>
      </div>

      {/* Widget zone */}
      <div className="mx-4 flex-1 min-h-0 overflow-y-auto space-y-2 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Widgets</p>
            <p className="text-[9px] text-muted-foreground/60">{widgets.length}/30 added</p>
          </div>
          <button onClick={() => setShowPicker(p => !p)} className="text-[10px] font-medium text-primary hover:text-primary/80 flex items-center gap-1">
            {showPicker ? <X className="size-3" /> : <Plus className="size-3" />}{showPicker ? "Close" : "Add"}
          </button>
        </div>

        {showPicker && <WidgetPicker widgets={widgets} onAdd={addWidget} onClose={() => setShowPicker(false)} />}

        {widgets.length === 0 && !showPicker && (
          <div className="flex flex-col items-center justify-center py-6 rounded-2xl border border-dashed border-border/40 text-center gap-2">
            <span className="text-2xl">🧩</span>
            <p className="text-xs text-muted-foreground">No widgets yet — pick from 30!</p>
            <button onClick={() => setShowPicker(true)} className="text-[11px] font-medium text-primary hover:text-primary/80">+ Add your first widget</button>
          </div>
        )}

        {widgets.map(w => <WidgetCard key={w.id} widget={w} onRemove={() => removeWidget(w.id)} weather={weather} />)}
      </div>

      <div className="h-2 shrink-0" />
    </div>
  )
}
