"use client"

import { useState, useEffect, useRef } from "react"
import {
  ChevronLeft, Search, Phone, Map, MessageCircle, Camera, Music,
  PlayCircle, Mail, Globe, Plane, ShoppingBag,
  Newspaper, Banknote, Settings, BookOpen, Heart, Mic, MicOff, Plus, X, Check,
} from "lucide-react"
import type { AppShared } from "./types"
import { cn } from "@/lib/utils"

interface AppItem {
  label:     string
  bg:        string
  icon:      React.ReactNode
  url:       string | null
  deepLink:  string | null
  category?: string
  removable: boolean
}

/* ── deep-link helper ───────────────────────────────────────── */
function openAppUrl(url: string, deepLink: string | null) {
  if (url === "sms:" || url === "tel:") { window.location.href = url; return }
  if (deepLink) {
    const iframe = document.createElement("iframe")
    iframe.style.display = "none"
    document.body.appendChild(iframe)
    iframe.src = deepLink
    setTimeout(() => { document.body.removeChild(iframe); window.open(url, "_blank") }, 1200)
  } else {
    window.open(url, "_blank")
  }
}

/* ── standard app list (no Airtel, no Stanbic) ─────────────── */
const STANDARD_APPS: AppItem[] = [
  { label: "Amazon",    bg: "#ff9900", icon: <ShoppingBag className="size-5" />, url: "https://amazon.com",          deepLink: null,             category: "Shopping",     removable: true  },
  { label: "Booking",   bg: "#003580", icon: <Plane       className="size-5" />, url: "https://booking.com",         deepLink: null,             category: "Travel",       removable: true  },
  { label: "Camera",    bg: "#1c1c1e", icon: <Camera      className="size-5" />, url: null,                          deepLink: null,             category: "System",       removable: false },
  { label: "Chrome",    bg: "#1d6cf0", icon: <Globe       className="size-5" />, url: "https://google.com",          deepLink: null,             category: "Web",          removable: true  },
  { label: "Flights",   bg: "#00a1e0", icon: <Plane       className="size-5" />, url: "https://google.com/flights",  deepLink: null,             category: "Travel",       removable: true  },
  { label: "Gmail",     bg: "#ea4335", icon: <Mail        className="size-5" />, url: "https://gmail.com",           deepLink: "googlegmail://", category: "Communication",removable: true  },
  { label: "Health",    bg: "#30b0c7", icon: <Heart       className="size-5" />, url: null,                          deepLink: null,             category: "Health",       removable: true  },
  { label: "Maps",      bg: "#4a90e2", icon: <Map         className="size-5" />, url: "https://maps.google.com",     deepLink: "geo:0,0",        category: "Navigation",   removable: true  },
  { label: "Messages",  bg: "#30d158", icon: <MessageCircle className="size-5" />, url: "sms:",                      deepLink: null,             category: "Communication",removable: false },
  { label: "Music",     bg: "#fa233b", icon: <Music       className="size-5" />, url: "https://open.spotify.com",    deepLink: "spotify://",     category: "Media",        removable: true  },
  { label: "News",      bg: "#222",    icon: <Newspaper   className="size-5" />, url: "https://news.google.com",     deepLink: null,             category: "News",         removable: true  },
  { label: "Phone",     bg: "#34c759", icon: <Phone       className="size-5" />, url: "tel:",                        deepLink: null,             category: "System",       removable: false },
  { label: "Settings",  bg: "#8e8e93", icon: <Settings    className="size-5" />, url: null,                          deepLink: null,             category: "System",       removable: false },
  { label: "WhatsApp",  bg: "#25d366", icon: <MessageCircle className="size-5" />, url: "https://wa.me",             deepLink: "whatsapp://",    category: "Communication",removable: true  },
  { label: "Wikipedia", bg: "#000",    icon: <BookOpen    className="size-5" />, url: "https://wikipedia.org",       deepLink: null,             category: "Knowledge",    removable: true  },
  { label: "YouTube",   bg: "#ff0000", icon: <PlayCircle  className="size-5" />, url: "https://youtube.com",         deepLink: "youtube://",     category: "Media",        removable: true  },
]

const HIDDEN_KEY = "lex-drawer-hidden-v1"
const CUSTOM_KEY = "lex-drawer-custom-v1"

function loadHidden(): string[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]") } catch { return [] }
}
function saveHidden(h: string[]) {
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify(h)) } catch {}
}

interface CustomApp { label: string; url: string; category: string }
function loadCustom(): CustomApp[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]") } catch { return [] }
}
function saveCustom(c: CustomApp[]) {
  try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(c)) } catch {}
}

function recordUsage(appName: string) {
  const now = new Date()
  fetch("/api/analysis", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "local", type: "usage", action: `app:${appName}`, hour_of_day: now.getHours(), day_of_week: now.getDay() }),
  }).catch(() => {})
}

function extractAppFromVoice(text: string, apps: AppItem[]): string | null {
  const t = text.toLowerCase().trim()
  const patterns = [
    /^(?:open|launch|start|go to|navigate to|take me to|show me)\s+(.+)$/i,
    /^(.+)\s+(?:app|application)$/i,
  ]
  for (const pat of patterns) {
    const m = t.match(pat)
    if (m) {
      const name  = m[1].trim()
      const found = apps.find(a => a.label.toLowerCase() === name || a.label.toLowerCase().includes(name))
      if (found) return found.label
    }
  }
  return apps.find(a => t.includes(a.label.toLowerCase()))?.label ?? null
}

type AnyWindow = typeof window & {
  SpeechRecognition?: new () => SpeechRecognition
  webkitSpeechRecognition?: new () => SpeechRecognition
}

/* ── Add-App modal ──────────────────────────────────────────── */
function AddAppModal({ onAdd, onClose }: { onAdd: (app: CustomApp) => void; onClose: () => void }) {
  const [label, setLabel] = useState("")
  const [url,   setUrl]   = useState("")
  const [cat,   setCat]   = useState("Other")

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm">
      <div className="w-full rounded-t-3xl bg-card px-5 py-6 space-y-4 border-t border-border">
        <h3 className="text-base font-bold text-foreground">Add App</h3>
        <div className="space-y-2">
          <input
            value={label} onChange={e => setLabel(e.target.value)}
            placeholder="App name (e.g. Instagram)"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 ring-primary"
          />
          <input
            value={url} onChange={e => setUrl(e.target.value)}
            placeholder="URL (e.g. https://instagram.com)"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 ring-primary"
          />
          <select
            value={cat} onChange={e => setCat(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none"
          >
            {["Social","Communication","Shopping","Media","News","Finance","Travel","Health","Other"].map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground"
          >Cancel</button>
          <button
            onClick={() => { if (label.trim() && url.trim()) { onAdd({ label: label.trim(), url: url.trim(), category: cat }); onClose() } }}
            disabled={!label.trim() || !url.trim()}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            <Check className="size-4 inline mr-1" />Add
          </button>
        </div>
      </div>
    </div>
  )
}

export function DrawerScreen({ goBack, time, navigate }: AppShared) {
  const [query,       setQuery]       = useState("")
  const [suggested,   setSuggested]   = useState<AppItem[]>([])
  const [voiceActive, setVoice]       = useState(false)
  const [voiceHint,   setVoiceHint]   = useState("")
  const [manage,      setManage]      = useState(false)
  const [hidden,      setHidden]      = useState<string[]>([])
  const [customApps,  setCustomApps]  = useState<CustomApp[]>([])
  const [showAdd,     setShowAdd]     = useState(false)
  const recognitionRef                = useRef<SpeechRecognition | null>(null)

  const fmtTime = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""

  useEffect(() => {
    setHidden(loadHidden())
    setCustomApps(loadCustom())
  }, [])

  /* merge standard + custom, minus hidden */
  const allApps: AppItem[] = [
    ...STANDARD_APPS,
    ...customApps.map(c => ({
      label: c.label, bg: "#555", icon: <Globe className="size-5" />,
      url: c.url, deepLink: null, category: c.category, removable: true,
    })),
  ].filter(a => !hidden.includes(a.label))

  /* suggestions */
  useEffect(() => {
    fetch("/api/analysis?userId=local&type=patterns")
      .then(r => r.json())
      .then(data => {
        const hour = new Date().getHours()
        const patterns: Array<{ action: string; count: number; hour_of_day: number }> = data.patterns ?? []
        const sorted = patterns
          .filter(p => p.action.startsWith("app:"))
          .sort((a, b) => {
            const hm = Math.abs((a.hour_of_day ?? 12) - hour) - Math.abs((b.hour_of_day ?? 12) - hour)
            return hm !== 0 ? hm : b.count - a.count
          })
          .slice(0, 4)
          .map(p => allApps.find(a => `app:${a.label}` === p.action))
          .filter(Boolean) as AppItem[]
        setSuggested(sorted.length >= 2 ? sorted : allApps.filter(a => ["WhatsApp","Music","YouTube","Chrome"].includes(a.label)))
      })
      .catch(() => setSuggested(allApps.filter(a => ["WhatsApp","Music","YouTube","Chrome"].includes(a.label))))

    const handler = (e: Event) => {
      const name = (e as CustomEvent<{ appName: string }>).detail.appName
      const app  = allApps.find(a => a.label.toLowerCase() === name.toLowerCase())
      if (app) openApp(app)
    }
    window.addEventListener("lex-open-app", handler)
    return () => window.removeEventListener("lex-open-app", handler)
  }, [hidden, customApps])

  const filtered = query.trim()
    ? allApps.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : allApps

  function openApp(app: AppItem) {
    recordUsage(app.label)
    if (app.url) {
      openAppUrl(app.url, app.deepLink)
    } else if (app.label === "Settings") {
      navigate("settings")
    } else if (app.label === "Camera") {
      const input = document.createElement("input")
      input.type = "file"; input.accept = "image/*"; input.capture = "environment"
      input.click()
    }
  }

  function hideApp(label: string) {
    const next = [...hidden, label]
    setHidden(next); saveHidden(next)
  }

  function addCustomApp(app: CustomApp) {
    const next = [...customApps, app]
    setCustomApps(next); saveCustom(next)
  }

  function startVoice() {
    const w  = window as AnyWindow
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) { setVoiceHint("Voice not supported in this browser"); return }
    const rec = new SR()
    recognitionRef.current = rec
    rec.continuous = false; rec.interimResults = true; rec.lang = "en-US"
    setVoice(true); setVoiceHint("Listening… say 'open WhatsApp'")
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(" ")
      setVoiceHint(`"${transcript}"`)
      if (e.results[e.results.length - 1].isFinal) {
        const name = extractAppFromVoice(transcript, allApps)
        if (name) {
          const app = allApps.find(a => a.label === name)
          if (app) { setVoiceHint(`Opening ${name}…`); setTimeout(() => { openApp(app); setVoice(false); setVoiceHint("") }, 500); return }
        }
        setVoiceHint(`No app found for "${transcript}"`); setTimeout(() => { setVoice(false); setVoiceHint("") }, 2000)
      }
    }
    rec.onerror = () => { setVoice(false); setVoiceHint("") }
    rec.onend   = () => setVoice(false)
    rec.start()
  }

  function stopVoice() { recognitionRef.current?.stop(); setVoice(false); setVoiceHint("") }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* status bar */}
      <div className="flex items-center justify-between px-6 pt-4 text-foreground shrink-0">
        <span className="text-[13px] font-bold tabular-nums">{fmtTime}</span>
        <span className="text-[11px] font-semibold text-primary">Apps</span>
      </div>

      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-2 shrink-0">
        <button onClick={goBack} className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform">
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="flex-1 text-xl font-bold text-foreground">App Drawer</h2>

        {/* add + manage */}
        <button
          onClick={() => setShowAdd(true)}
          className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary active:scale-90 transition-transform"
          title="Add app"
        >
          <Plus className="size-4" />
        </button>
        <button
          onClick={() => setManage(m => !m)}
          className={cn(
            "flex size-9 items-center justify-center rounded-full transition-all active:scale-90 text-sm font-semibold",
            manage ? "bg-primary text-primary-foreground" : "bg-accent/60 text-muted-foreground",
          )}
          title={manage ? "Done" : "Manage"}
        >
          {manage ? <Check className="size-4" /> : <Settings className="size-4" />}
        </button>
        <button
          onClick={voiceActive ? stopVoice : startVoice}
          className={cn(
            "flex size-9 items-center justify-center rounded-full transition-all active:scale-90",
            voiceActive ? "bg-red-500 text-white animate-pulse" : "bg-accent/60 text-muted-foreground",
          )}
        >
          {voiceActive ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
      </div>

      {voiceHint && (
        <div className="mx-5 mb-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs text-primary font-medium shrink-0">
          {voiceHint}
        </div>
      )}

      {manage && (
        <div className="mx-5 mb-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs text-yellow-500 font-medium shrink-0">
          Tap the <X className="size-3 inline" /> to remove an app. Core system apps can't be removed.
        </div>
      )}

      {/* search */}
      <div className="px-5 pb-2 shrink-0">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search apps…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && <button onClick={() => setQuery("")} className="text-muted-foreground text-xs">✕</button>}
        </div>
      </div>

      {/* suggested */}
      {!query && !manage && suggested.length > 0 && (
        <div className="px-5 pb-3 shrink-0">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">You usually open</p>
          <div className="flex justify-between">
            {suggested.map(a => (
              <button key={a.label} onClick={() => openApp(a)} className="flex flex-col items-center gap-1 group">
                <span className="flex size-14 items-center justify-center rounded-2xl text-white shadow-md group-active:scale-90 transition-transform" style={{ background: a.bg }}>{a.icon}</span>
                <span className="text-[10px] font-medium text-foreground/80">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3-column app grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 px-5 py-3">
          {filtered.map(app => (
            <div key={app.label} className="relative flex flex-col items-center">
              <button
                onClick={() => openApp(app)}
                className="flex flex-col items-center gap-1.5 active:scale-90 transition-transform w-full"
              >
                <span
                  className="flex size-[60px] shrink-0 items-center justify-center rounded-[20px] text-white shadow-md"
                  style={{ background: app.bg }}
                >
                  {app.icon}
                </span>
                <span className="text-[11px] font-medium text-foreground/90 text-center leading-tight max-w-[72px] truncate block">
                  {app.label}
                </span>
              </button>
              {manage && app.removable && (
                <button
                  onClick={() => hideApp(app.label)}
                  className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-foreground/70 text-background shadow-md"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Search className="size-8 opacity-20 mb-2" />
            <p className="text-sm">No apps found</p>
          </div>
        )}
        <div className="h-4" />
      </div>

      {showAdd && <AddAppModal onAdd={addCustomApp} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
