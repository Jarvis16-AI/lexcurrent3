"use client"

import { useState, useEffect, useRef } from "react"
import {
  ChevronLeft, Search, Phone, Map, MessageCircle, Camera, Music,
  PlayCircle, Mail, Globe, Building2, Plane, ShoppingBag,
  Newspaper, Banknote, Wifi, Settings, BookOpen, Heart, Mic, MicOff, Loader2,
} from "lucide-react"
import type { AppShared } from "./types"
import { cn } from "@/lib/utils"

interface AppItem {
  label: string
  bg: string
  icon: React.ReactNode
  url: string | null
  category?: string
}

const ALL_APPS: AppItem[] = [
  { label: "Airtel",      bg: "#e40000", icon: <Wifi        className="size-5" />, url: null,                          category: "Utilities" },
  { label: "Amazon",      bg: "#ff9900", icon: <ShoppingBag className="size-5" />, url: "https://amazon.com",          category: "Shopping"  },
  { label: "Banking",     bg: "#0a7d2c", icon: <Banknote    className="size-5" />, url: null,                          category: "Finance"   },
  { label: "Booking",     bg: "#003580", icon: <Plane       className="size-5" />, url: "https://booking.com",         category: "Travel"    },
  { label: "Camera",      bg: "#1c1c1e", icon: <Camera      className="size-5" />, url: null,                          category: "System"    },
  { label: "Chrome",      bg: "#1d6cf0", icon: <Globe       className="size-5" />, url: "https://google.com",          category: "Web"       },
  { label: "DStv",        bg: "#003087", icon: <PlayCircle  className="size-5" />, url: null,                          category: "Media"     },
  { label: "Flights",     bg: "#00a1e0", icon: <Plane       className="size-5" />, url: "https://google.com/flights",  category: "Travel"    },
  { label: "Gmail",       bg: "#ea4335", icon: <Mail        className="size-5" />, url: "https://gmail.com",           category: "Communication" },
  { label: "Health",      bg: "#30b0c7", icon: <Heart       className="size-5" />, url: null,                          category: "Health"    },
  { label: "Jumia",       bg: "#f68b1e", icon: <ShoppingBag className="size-5" />, url: "https://jumia.co.zm",         category: "Shopping"  },
  { label: "Maps",        bg: "#4a90e2", icon: <Map         className="size-5" />, url: "https://maps.google.com",     category: "Navigation" },
  { label: "Messages",    bg: "#30d158", icon: <MessageCircle className="size-5" />, url: "sms:",                      category: "Communication" },
  { label: "Music",       bg: "#fa233b", icon: <Music       className="size-5" />, url: "https://open.spotify.com",    category: "Media"     },
  { label: "News",        bg: "#222",    icon: <Newspaper   className="size-5" />, url: "https://news.google.com",     category: "News"      },
  { label: "Phone",       bg: "#34c759", icon: <Phone       className="size-5" />, url: "tel:",                        category: "System"    },
  { label: "Settings",    bg: "#8e8e93", icon: <Settings    className="size-5" />, url: null,                          category: "System"    },
  { label: "Stanbic",     bg: "#003087", icon: <Banknote    className="size-5" />, url: null,                          category: "Finance"   },
  { label: "WhatsApp",    bg: "#25d366", icon: <MessageCircle className="size-5" />, url: "https://web.whatsapp.com",  category: "Communication" },
  { label: "Wikipedia",   bg: "#000",    icon: <BookOpen    className="size-5" />, url: "https://wikipedia.org",       category: "Knowledge" },
  { label: "YouTube",     bg: "#ff0000", icon: <PlayCircle  className="size-5" />, url: "https://youtube.com",         category: "Media"     },
]

function recordUsage(appName: string) {
  const now = new Date()
  fetch("/api/analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "local", type: "usage", action: `app:${appName}`,
      hour_of_day: now.getHours(), day_of_week: now.getDay(),
    }),
  }).catch(() => {})
}

/* voice command: extract app name from phrases like "open WhatsApp", "launch chrome" */
function extractAppFromVoice(text: string): string | null {
  const t = text.toLowerCase().trim()
  const patterns = [
    /^(?:open|launch|start|go to|navigate to|take me to|show me)\s+(.+)$/i,
    /^(.+)\s+(?:app|application)$/i,
  ]
  for (const pat of patterns) {
    const m = t.match(pat)
    if (m) {
      const name = m[1].trim()
      const found = ALL_APPS.find(a => a.label.toLowerCase() === name || a.label.toLowerCase().includes(name))
      if (found) return found.label
    }
  }
  const directMatch = ALL_APPS.find(a => t.includes(a.label.toLowerCase()))
  return directMatch?.label ?? null
}

function StatusBar({ time }: { time: Date | null }) {
  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
  return (
    <div className="flex items-center justify-between px-6 pt-4 text-foreground">
      <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
      <span className="text-[11px] font-semibold text-primary">Apps</span>
    </div>
  )
}

type AnyWindow = typeof window & {
  SpeechRecognition?: new () => SpeechRecognition
  webkitSpeechRecognition?: new () => SpeechRecognition
}

export function DrawerScreen({ goBack, time, navigate }: AppShared) {
  const [query, setQuery]           = useState("")
  const [suggested, setSuggested]   = useState<AppItem[]>([])
  const [voiceActive, setVoice]     = useState(false)
  const [voiceHint, setVoiceHint]   = useState("")
  const recognitionRef              = useRef<SpeechRecognition | null>(null)

  /* load dynamic suggestions from usage patterns */
  useEffect(() => {
    fetch("/api/analysis?userId=local&type=patterns")
      .then(r => r.json())
      .then(data => {
        const hour = new Date().getHours()
        const patterns: Array<{ action: string; count: number; hour_of_day: number }> = data.patterns ?? []
        const sorted = patterns
          .filter(p => p.action.startsWith("app:"))
          .sort((a, b) => {
            const hourMatch = Math.abs((a.hour_of_day ?? 12) - hour) - Math.abs((b.hour_of_day ?? 12) - hour)
            return hourMatch !== 0 ? hourMatch : b.count - a.count
          })
          .slice(0, 4)
          .map(p => ALL_APPS.find(a => `app:${a.label}` === p.action))
          .filter(Boolean) as AppItem[]

        if (sorted.length >= 2) {
          setSuggested(sorted)
        } else {
          setSuggested(ALL_APPS.filter(a => ["WhatsApp", "Music", "Chrome", "YouTube"].includes(a.label)))
        }
      })
      .catch(() => {
        setSuggested(ALL_APPS.filter(a => ["WhatsApp", "Music", "Chrome", "YouTube"].includes(a.label)))
      })

    /* listen for voice-triggered app open */
    const handler = (e: Event) => {
      const name = (e as CustomEvent<{ appName: string }>).detail.appName
      const app = ALL_APPS.find(a => a.label.toLowerCase() === name.toLowerCase())
      if (app) openApp(app)
    }
    window.addEventListener("lex-open-app", handler)
    return () => window.removeEventListener("lex-open-app", handler)
  }, [])

  const filtered = query.trim()
    ? ALL_APPS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()))
    : ALL_APPS

  const grouped: Record<string, AppItem[]> = {}
  filtered.forEach(a => {
    const key = a.label[0].toUpperCase()
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(a)
  })

  function openApp(app: AppItem) {
    recordUsage(app.label)
    if (app.url) {
      if (app.url === "sms:" || app.url === "tel:") {
        window.location.href = app.url
      } else {
        window.open(app.url, "_blank")
      }
    } else if (app.label === "Settings") {
      navigate("settings")
    }
  }

  function startVoiceLaunch() {
    const w = window as AnyWindow
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!SR) { setVoiceHint("Voice not supported in this browser"); return }

    const rec = new SR()
    recognitionRef.current = rec
    rec.continuous     = false
    rec.interimResults = true
    rec.lang           = "en-US"

    setVoice(true)
    setVoiceHint("Listening… say 'open WhatsApp'")

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join(" ")
      setVoiceHint(`"${transcript}"`)

      if (e.results[e.results.length - 1].isFinal) {
        const appName = extractAppFromVoice(transcript)
        if (appName) {
          const app = ALL_APPS.find(a => a.label === appName)
          if (app) {
            setVoiceHint(`Opening ${appName}…`)
            setTimeout(() => { openApp(app); setVoice(false); setVoiceHint("") }, 500)
            return
          }
        }
        setVoiceHint(`No app found for "${transcript}"`)
        setTimeout(() => { setVoice(false); setVoiceHint("") }, 2000)
      }
    }

    rec.onerror = () => {
      setVoice(false)
      setVoiceHint("")
    }
    rec.onend = () => { setVoice(false) }
    rec.start()
  }

  function stopVoiceLaunch() {
    recognitionRef.current?.stop()
    setVoice(false)
    setVoiceHint("")
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <StatusBar time={time} />

      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-2">
        <button
          onClick={goBack}
          className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h2 className="flex-1 text-xl font-bold text-foreground">App Drawer</h2>
        <button
          onClick={voiceActive ? stopVoiceLaunch : startVoiceLaunch}
          className={cn(
            "flex size-9 items-center justify-center rounded-full transition-all active:scale-90",
            voiceActive ? "bg-red-500 text-white animate-pulse" : "bg-accent/60 text-muted-foreground"
          )}
          title="Voice launch"
        >
          {voiceActive ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
      </div>

      {/* voice hint bar */}
      {voiceHint && (
        <div className="mx-5 mb-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-xs text-primary font-medium">
          {voiceHint}
        </div>
      )}

      {/* search */}
      <div className="px-5 pb-2">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search apps…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground text-xs">✕</button>
          )}
        </div>
      </div>

      {/* suggested (dynamic, time-aware) */}
      {!query && suggested.length > 0 && (
        <div className="px-5 pb-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">You usually open</p>
          <div className="flex justify-between">
            {suggested.map(a => (
              <button key={a.label} onClick={() => openApp(a)} className="flex flex-col items-center gap-1 group">
                <span
                  className="flex size-14 items-center justify-center rounded-2xl text-white shadow-md group-active:scale-90 transition-transform"
                  style={{ background: a.bg }}
                >
                  {a.icon}
                </span>
                <span className="text-[10px] font-medium text-foreground/80">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* alphabetical list */}
      <div className="flex-1 overflow-y-auto px-5">
        {Object.keys(grouped).sort().map(letter => (
          <div key={letter}>
            <p className="py-1 text-xs font-bold text-muted-foreground">{letter}</p>
            {grouped[letter].map(app => (
              <button
                key={app.label}
                onClick={() => openApp(app)}
                className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left hover:bg-accent/50 active:bg-accent transition-colors"
              >
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ background: app.bg }}
                >
                  {app.icon}
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-medium text-foreground">{app.label}</p>
                  {app.category && (
                    <p className="text-[10px] text-muted-foreground">{app.category}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <Search className="size-8 opacity-20 mb-2" />
            <p className="text-sm">No apps found</p>
          </div>
        )}
        <div className="h-4" />
      </div>
    </div>
  )
}
