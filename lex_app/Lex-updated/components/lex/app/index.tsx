"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Screen, Weather, Msg } from "./types"
import { HomeScreen }       from "./home"
import { LexScreen }        from "./lex-chat"
import { VoiceScreen }      from "./voice"
import { FocusScreen }      from "./focus"
import { SpaceScreen }      from "./space"
import { DrawerScreen }     from "./drawer"
import { SettingsScreen }   from "./settings"
import { PaywallScreen }    from "./paywall"
import { PaymentScreen }    from "./payment"
import { WeatherSearch }    from "./weather-search"
import { MemoryTreeScreen } from "./memory-tree"
import { PermissionsScreen } from "./permissions"
import { AnalysisScreen }   from "./analysis"
import { SearchScreen }     from "./search"
import { EmergencyScreen }  from "./emergency"
import { NotificationPanel, buildNotifications } from "./notifications"
import type { Notification } from "./notifications"
import { LockSetup }  from "../lock/setup"
import { LockScreen } from "../lock/screen"
import { getLockConfig, clearLockConfig, type LockConfig } from "../lock/utils"
import {
  type AppSettings,
  loadSettings, saveSettings, applyAllSettings, WALLPAPERS,
} from "@/lib/settings"
import {
  getQuota, incrementQuota, isPremium, type PremiumTier,
} from "@/lib/quota"
import { cn } from "@/lib/utils"
import { Grid2x2, Star, Search, Sparkles, BotMessageSquare } from "lucide-react"
import { AnimatedOrb } from "../animated-orb"

type LockState = "loading" | "setup" | "locked" | "unlocked"

/* ── browser TTS fallback ─────────────────────────────────────── */
function browserSpeak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const utt   = new SpeechSynthesisUtterance(text.slice(0, 300))
  utt.rate    = 1.05; utt.pitch = 1.0; utt.volume = 1.0
  const voices = window.speechSynthesis.getVoices()
  const pref   = voices.find(v => /google|samantha|zira|david/i.test(v.name))
  if (pref) utt.voice = pref
  window.speechSynthesis.speak(utt)
}

/* ── browser STT ──────────────────────────────────────────────── */
type AnyWindow = typeof window & {
  SpeechRecognition?: new() => SpeechRecognition
  webkitSpeechRecognition?: new() => SpeechRecognition
}
function getBrowserSTT(): (new() => SpeechRecognition) | null {
  if (typeof window === "undefined") return null
  const w = window as AnyWindow
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/* ── voice command parser ──────────────────────────────────────── */
const APP_NAMES = [
  "airtel","amazon","banking","booking","camera","chrome","dstv","flights",
  "gmail","health","jumia","maps","messages","music","news","phone",
  "settings","stanbic","whatsapp","wikipedia","youtube",
]
function parseVoiceCmd(text: string): { type: "open_app"; appName: string } | { type: "navigate"; screen: Screen } | null {
  const t = text.toLowerCase().trim()

  const navMap: Record<string, Screen> = {
    "memory": "memory", "memory tree": "memory",
    "analysis": "analysis", "screen time": "analysis", "personal analysis": "analysis",
    "permissions": "permissions",
    "emergency": "emergency", "sos": "emergency",
    "search": "search",
    "settings": "settings",
    "home": "home",
    "focus": "focus",
    "space": "space",
  }
  for (const [phrase, screen] of Object.entries(navMap)) {
    if (t.includes(`go to ${phrase}`) || t.includes(`open ${phrase}`) || t.includes(`show ${phrase}`)) {
      return { type: "navigate", screen }
    }
  }

  const m = t.match(/^(?:open|launch|start|go to|navigate to|take me to)\s+(.+)$/i)
  if (m) {
    const name = m[1].trim().toLowerCase().replace(/\s+app$/, "")
    const found = APP_NAMES.find(a => a === name || name.includes(a) || a.includes(name))
    if (found) return { type: "open_app", appName: found }
  }
  return null
}

/* ── screen-time helpers ─────────────────────────────────────── */
const ST_BATCH_KEY = "lex-st-batch-v1"
interface STEntry { screen: string; ms: number }

function flushScreenTime() {
  try {
    const raw  = localStorage.getItem(ST_BATCH_KEY)
    if (!raw) return
    const batch: STEntry[] = JSON.parse(raw)
    if (!batch.length) return
    localStorage.removeItem(ST_BATCH_KEY)
    for (const entry of batch) {
      fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "local", type: "screen_time", screen: entry.screen, duration_ms: entry.ms }),
      }).catch(() => {})
    }
  } catch { /* ignore */ }
}

function recordScreenTime(screen: string, ms: number) {
  try {
    const raw   = localStorage.getItem(ST_BATCH_KEY)
    const batch: STEntry[] = raw ? JSON.parse(raw) : []
    batch.push({ screen, ms })
    localStorage.setItem(ST_BATCH_KEY, JSON.stringify(batch))
    if (batch.length >= 5) flushScreenTime()
  } catch { /* ignore */ }
}

/* ── attention span alert ─────────────────────────────────────── */
const ATTENTION_KEY = "lex-attention-v1"
function checkAttention(screenEnterTime: number, thresholdMin: number): boolean {
  const elapsed = Date.now() - screenEnterTime
  return elapsed > thresholdMin * 60 * 1000
}

/* ── bottom nav ────────────────────────────────────────────────── */
function BottomNav({
  screen, navigate, lexUnread,
}: {
  screen: Screen
  navigate: (s: Screen) => void
  lexUnread: number
}) {
  const active = "text-primary"
  const idle   = "text-muted-foreground"
  return (
    <nav className="flex items-center justify-around border-t border-border/60 bg-card/90 px-4 pb-2 pt-2 backdrop-blur-sm shrink-0">
      <button onClick={() => navigate("search")} className="flex flex-col items-center gap-0.5">
        <Search className={cn("size-5 transition-colors", screen === "search" ? active : idle)} />
        <span className={cn("text-[9px] font-medium", screen === "search" ? "text-primary" : idle)}>Search</span>
      </button>
      <button onClick={() => navigate("drawer")} className="flex flex-col items-center gap-0.5">
        <Sparkles className={cn("size-5 transition-colors", screen === "drawer" ? active : idle)} />
        <span className={cn("text-[9px] font-medium", screen === "drawer" ? "text-primary" : idle)}>Apps</span>
      </button>
      <button onClick={() => navigate("lex")} className="relative flex flex-col items-center gap-0.5">
        <BotMessageSquare className={cn("size-5 transition-colors", screen === "lex" ? active : idle)} />
        {lexUnread > 0 && screen !== "lex" && (
          <span className="absolute -top-1 -right-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none ring-2 ring-card animate-in zoom-in-75 duration-200">
            {lexUnread > 9 ? "9+" : lexUnread}
          </span>
        )}
        <span className={cn("text-[9px] font-medium", screen === "lex" ? "text-primary" : idle)}>LEX</span>
      </button>
      <button onClick={() => navigate("focus")} className="flex flex-col items-center gap-0.5">
        <Star className={cn("size-5 transition-colors", screen === "focus" ? active : idle)} />
        <span className={cn("text-[9px] font-medium", screen === "focus" ? "text-primary" : idle)}>Focus</span>
      </button>
      <button onClick={() => navigate("home")} className="flex flex-col items-center gap-0.5">
        <Grid2x2 className={cn("size-5 transition-colors", screen === "home" ? active : idle)} />
        <span className={cn("text-[9px] font-medium", screen === "home" ? "text-primary" : idle)}>Home</span>
      </button>
    </nav>
  )
}

/* ── draggable floating orb (tap = LEX, hold 2s = Emergency) ──── */
function DraggableOrb({
  navigate, screen, onEmergency, lexUnread,
}: {
  navigate: (s: Screen) => void
  screen: Screen
  onEmergency: () => void
  lexUnread: number
}) {
  const [pos, setPos]         = useState({ x: 0, y: 0 })
  const [ready, setReady]     = useState(false)
  const [holding, setHolding] = useState(false)
  const dragging              = useRef(false)
  const startPt               = useRef({ x: 0, y: 0 })
  const startPos              = useRef({ x: 0, y: 0 })
  const moved                 = useRef(false)
  const containerRef          = useRef<HTMLDivElement>(null)
  const holdTimer             = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = containerRef.current?.parentElement
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({ x: width / 2 - 28, y: height - 140 })
    setReady(true)
    /* flush any pending screen time on mount */
    flushScreenTime()
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    moved.current    = false
    startPt.current  = { x: e.clientX, y: e.clientY }
    startPos.current = { ...pos }

    /* start hold timer for emergency */
    holdTimer.current = setTimeout(() => {
      if (!moved.current) {
        setHolding(false)
        onEmergency()
      }
    }, 1800)
    setHolding(true)
  }, [pos, onEmergency])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startPt.current.x
    const dy = e.clientY - startPt.current.y
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      moved.current = true
      setHolding(false)
      if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
    }
    const el = containerRef.current?.parentElement
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({
      x: Math.max(0, Math.min(width  - 56, startPos.current.x + dx)),
      y: Math.max(0, Math.min(height - 56, startPos.current.y + dy)),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
    setHolding(false)
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
    if (!moved.current) navigate("lex")
  }, [navigate])

  if (!ready) return null

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", left: pos.x, top: pos.y, zIndex: 50, touchAction: "none" }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          "cursor-grab active:cursor-grabbing select-none transition-transform duration-100",
          holding ? "scale-125" : "hover:scale-105",
        )}
        title="Tap for LEX · Hold for Emergency"
      >
        <AnimatedOrb
          className={cn(
            "size-14 drop-shadow-2xl transition-all duration-300",
            holding ? "opacity-100 [filter:hue-rotate(120deg)]" : screen === "lex" ? "opacity-100" : "opacity-85",
          )}
        />
        {holding && (
          <div className="absolute inset-0 rounded-full animate-ping bg-red-500/30" />
        )}
        {lexUnread > 0 && !holding && screen !== "lex" && (
          <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none ring-2 ring-card shadow-lg animate-in zoom-in-75 duration-200">
            {lexUnread > 9 ? "9+" : lexUnread}
          </span>
        )}
      </div>
    </div>
  )
}

function HomeBar() {
  return (
    <div className="flex justify-center pb-2 pt-1 shrink-0">
      <div className="h-1 w-28 rounded-full bg-foreground/20" />
    </div>
  )
}

/* ── attention alert banner ────────────────────────────────────── */
function AttentionBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="absolute top-16 left-4 right-4 z-40 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 backdrop-blur-sm px-4 py-3 flex items-center gap-3 shadow-lg">
      <span className="text-lg">⏰</span>
      <div className="flex-1">
        <p className="text-xs font-bold text-yellow-400">Attention check</p>
        <p className="text-[11px] text-muted-foreground">You've been here a while. Take a quick break!</p>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs px-2">Dismiss</button>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   MAIN APP
   ════════════════════════════════════════════════════════════════ */
export function LexApp() {
  /* ── lock ── */
  const [lockState,   setLockState]   = useState<LockState>("loading")
  const [lockConfig,  setLockConfig_] = useState<LockConfig | null>(null)

  /* ── settings ── */
  const [settings, setSettings_] = useState<AppSettings>(() =>
    typeof window === "undefined" ? {
      theme: "dark", accentPreset: "amber", wallpaper: "amber",
      fontSize: "md", voiceId: "21m00Tcm4TlvDq8ikWAM", voiceName: "Rachel",
      voiceEnabled: true, autoSpeak: true, aiPersonality: "friendly", notifSound: true, dnd: false,
    } : loadSettings()
  )

  /* ── navigation ── */
  const [screen,  setScreen]  = useState<Screen>("home")
  const [history, setHistory] = useState<Screen[]>(["home"])

  /* ── data ── */
  const [weather,   setWeather]   = useState<Weather | null>(null)
  const [time,      setTime]      = useState<Date | null>(null)
  const [messages,  setMessages]  = useState<Msg[]>([])
  const [thinking,  setThinking]  = useState(false)
  const [recording, setRecording] = useState(false)
  const [notifs,    setNotifs]    = useState<Notification[]>([])
  const [notifsOpen, setNotifsOpen] = useState(false)

  /* ── screen time & attention ── */
  const screenEnterRef        = useRef<number>(Date.now())
  const [showAttention, setShowAttention] = useState(false)
  const attentionTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── weather / search overlay ── */
  const [weatherSearchOpen, setWeatherSearchOpen] = useState(false)

  /* ── payment ── */
  const [selectedTier, setSelectedTier] = useState<PremiumTier>("pro")

  const mediaRef  = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  /* ── weather ── */
  const loadWeather = useCallback((lat: number | string, lng: number | string) => {
    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => { if (!d.error) { setWeather(d); setNotifs(buildNotifications(d)) } })
      .catch(() => {})
  }, [])

  const useDeviceLocation = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => loadWeather(p.coords.latitude, p.coords.longitude),
        () => setWeather(null),
      )
    }
  }, [loadWeather])

  /* ── init ── */
  useEffect(() => {
    const s = loadSettings()
    setSettings_(s)
    applyAllSettings(s)
    const cfg = getLockConfig()
    if (!cfg?.isSetup) { setLockState("setup") }
    else { setLockConfig_(cfg); setLockState("locked") }
  }, [])

  useEffect(() => {
    setTime(new Date())
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setNotifs(buildNotifications(null))
    useDeviceLocation()
  }, [useDeviceLocation])

  /* ── flush screen time on unload ── */
  useEffect(() => {
    const handler = () => {
      recordScreenTime(screen, Date.now() - screenEnterRef.current)
      flushScreenTime()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [screen])

  /* ── settings ── */
  const handleSettingsChange = useCallback((s: AppSettings) => {
    setSettings_(s); saveSettings(s); applyAllSettings(s)
  }, [])

  /* ── navigate (with screen time tracking + attention guard) ── */
  const navigate = useCallback((s: Screen) => {
    setScreen(prev => {
      /* record time on previous screen */
      const elapsed = Date.now() - screenEnterRef.current
      if (elapsed > 2000) recordScreenTime(prev, elapsed)
      screenEnterRef.current = Date.now()
      return s
    })
    /* clear LEX badge when opening chat */
    if (s === "lex") {
      setLexUnread(0)
      import("@/lib/lock-screen-settings").then(({ clearNotifications }) => {
        clearNotifications()
      }).catch(() => {})
    }
    setHistory(h => [...h, s])
    setShowAttention(false)
    if (attentionTimerRef.current) clearTimeout(attentionTimerRef.current)

    /* set attention timer based on user settings (default 30 min) */
    const thresholdMs = 30 * 60 * 1000
    attentionTimerRef.current = setTimeout(() => {
      if (!["voice", "emergency"].includes(s)) setShowAttention(true)
    }, thresholdMs)
  }, [])

  const goBack = useCallback(() => {
    setHistory(h => {
      const next = h.slice(0, -1)
      const prevScreen = next.length === 0 ? "home" as Screen : next[next.length - 1]
      /* record time */
      const elapsed = Date.now() - screenEnterRef.current
      if (elapsed > 2000) recordScreenTime(screen, elapsed)
      screenEnterRef.current = Date.now()
      setScreen(prevScreen)
      return next.length === 0 ? ["home"] : next
    })
  }, [screen])

  /* ── TTS ── */
  const speakReply = useCallback(async (text: string) => {
    const s = loadSettings()
    if (!s.voiceEnabled || !s.autoSpeak || s.dnd) return
    const snippet = text.slice(0, 300)
    try {
      const res = await fetch("/api/voice", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: snippet, voiceId: s.voiceId }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = new Audio(url)
        a.onended = () => URL.revokeObjectURL(url)
        a.onerror = () => { URL.revokeObjectURL(url); browserSpeak(snippet) }
        await a.play(); return
      }
    } catch { /* fall through */ }
    browserSpeak(snippet)
  }, [])

  /* ── build context for LEX including memories ── */
  const getCtx = useCallback(async (w: Weather | null): Promise<string> => {
    const s = loadSettings()
    const personality =
      s.aiPersonality === "professional" ? " Respond professionally and formally." :
      s.aiPersonality === "concise"      ? " Be brief — 1-2 sentences max."       :
      " Be warm, friendly and conversational."
    const weatherCtx = w ? `Location: ${w.city}. Weather: ${w.temp}${w.unit}, ${w.label}.` : ""

    let memCtx = ""
    try {
      const res  = await fetch("/api/memory?userId=local")
      const data = await res.json()
      const mems: Array<{ category: string; content: string }> = data.memories ?? []
      if (mems.length > 0) {
        const grouped = mems.reduce<Record<string, string[]>>((acc, m) => {
          if (!acc[m.category]) acc[m.category] = []
          acc[m.category].push(m.content)
          return acc
        }, {})
        const lines = Object.entries(grouped).map(([c, items]) => `${c}: ${items.slice(0, 3).join("; ")}`)
        memCtx = `\n\nWhat LEX knows about the user:\n${lines.join("\n")}`
      }
    } catch { /* ignore */ }

    return (weatherCtx + personality + memCtx).trim()
  }, [])

  /* ── send message (with quota guard + memory extraction) ── */
  const sendMessage = useCallback(async (text: string) => {
    const clean = text.trim()
    if (!clean || thinking) return

    if (!isPremium()) {
      const q = getQuota()
      if (q.exhausted) { navigate("paywall"); return }
    }

    const userMsg: Msg = { role: "user", content: clean }
    setMessages(prev => [...prev, userMsg])
    setThinking(true)
    navigate("lex")
    incrementQuota()

    try {
      const ctx   = await getCtx(weather)
      const res   = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], context: ctx }),
      })
      const data  = await res.json()
      const reply = (data.reply as string) ?? "Sorry, I couldn't process that."
      setMessages(prev => [...prev, { role: "assistant", content: reply }])
      speakReply(reply)

      /* write to lock-screen notification log */
      try {
        const { pushNotification } = await import("@/lib/lock-screen-settings")
        pushNotification({
          app:   "LEX",
          icon:  "🤖",
          title: "LEX replied",
          body:  reply.length > 90 ? reply.slice(0, 87) + "…" : reply,
        })
      } catch { /* non-critical */ }

      /* async: extract memories from this exchange */
      fetch("/api/memory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "local", userMessage: clean, assistantReply: reply }),
      }).catch(() => {})
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection issue — please try again." }])
    } finally {
      setThinking(false)
    }
  }, [messages, thinking, weather, navigate, speakReply, getCtx])

  /* ── STT: Groq Whisper → Browser SpeechRecognition ── */
  const tryBrowserSTT = useCallback(() => {
    const SR = getBrowserSTT()
    if (!SR) {
      setMessages(prev => [...prev, { role: "assistant", content: "Voice processing failed. Please type your message." }])
      setThinking(false); return
    }
    const rec = new SR()
    rec.continuous = false; rec.interimResults = false; rec.lang = "en-US"
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript
      setThinking(false)
      if (transcript?.trim()) {
        /* check for navigation/app-launch commands first */
        const cmd = parseVoiceCmd(transcript)
        if (cmd?.type === "navigate") { navigate(cmd.screen); return }
        if (cmd?.type === "open_app") {
          navigate("drawer")
          setTimeout(() => window.dispatchEvent(new CustomEvent("lex-open-app", { detail: { appName: cmd.appName } })), 400)
          return
        }
        sendMessage(transcript)
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: "I didn't catch that — please try again." }])
      }
    }
    rec.onerror = () => {
      setThinking(false)
      setMessages(prev => [...prev, { role: "assistant", content: "Voice processing failed. Please type instead." }])
    }
    rec.start()
  }, [sendMessage, navigate])

  const startVoice = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr     = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setRecording(false)
        navigate("lex")
        setThinking(true)
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const fd   = new FormData()
        fd.append("audio", blob, "voice.webm")
        try {
          const tres  = await fetch("/api/transcribe", { method: "POST", body: fd })
          const tdata = await tres.json()
          setThinking(false)
          const transcript = tdata.transcript?.trim()
          if (transcript) {
            /* check for navigation/app commands */
            const cmd = parseVoiceCmd(transcript)
            if (cmd?.type === "navigate") { navigate(cmd.screen); return }
            if (cmd?.type === "open_app") {
              navigate("drawer")
              setTimeout(() => window.dispatchEvent(new CustomEvent("lex-open-app", { detail: { appName: cmd.appName } })), 400)
              return
            }
            await sendMessage(transcript)
          } else {
            setMessages(prev => [...prev, { role: "assistant", content: "I didn't catch that — please try again." }])
          }
        } catch { tryBrowserSTT() }
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      navigate("voice")
    } catch { alert("Microphone access denied. Allow mic access to use voice.") }
  }, [navigate, sendMessage, tryBrowserSTT])

  const stopVoice = useCallback(() => { mediaRef.current?.stop(); setRecording(false) }, [])

  /* ── notifications ── */
  const openNotifications = useCallback(() => { setNotifs(ns => ns.map(n => ({ ...n, read: true }))); setNotifsOpen(true) }, [])
  const dismissNotif      = useCallback((id: string) => setNotifs(ns => ns.filter(n => n.id !== id)), [])
  const clearAllNotifs    = useCallback(() => { setNotifs([]); setNotifsOpen(false) }, [])
  const unreadCount       = notifs.filter(n => !n.read).length

  /* ── LEX chat unread badge (from lock-screen notification log) ── */
  const [lexUnread, setLexUnread] = useState(0)

  /* refresh badge count whenever the lock transitions to unlocked */
  useEffect(() => {
    if (lockState !== "unlocked") return
    import("@/lib/lock-screen-settings").then(({ loadNotifications }) => {
      setLexUnread(loadNotifications().length)
    }).catch(() => {})
  }, [lockState])

  /* ── lock handlers ── */
  const handleSetupComplete = useCallback((cfg: LockConfig) => { setLockConfig_(cfg); setLockState("unlocked") }, [])
  const handleUnlock        = useCallback(() => setLockState("unlocked"), [])
  const handleLockReset     = useCallback(() => { setLockConfig_(null); setLockState("setup") }, [])
  const handleChangeLock    = useCallback(() => { clearLockConfig(); setLockConfig_(null); setLockState("setup") }, [])

  /* ── payment handlers ── */
  const handleSelectPlan     = useCallback((tier: PremiumTier) => { setSelectedTier(tier); navigate("payment") }, [navigate])
  const handlePaymentSuccess = useCallback(() => { navigate("home") }, [navigate])

  /* ── wallpaper ── */
  const wallpaperStyle = WALLPAPERS[settings.wallpaper]?.gradient ?? WALLPAPERS.amber.gradient

  const shared = { screen, navigate, goBack, weather, time, messages, thinking, recording, sendMessage, startVoice, stopVoice }
  const noNav  = ["voice","settings","paywall","payment","emergency"].includes(screen)
  const noOrb  = ["voice","emergency"].includes(screen)

  return (
    <div className="flex h-dvh w-screen items-center justify-center overflow-hidden bg-stone-950 sm:p-4">
      <div className="pointer-events-none fixed inset-0" style={{ background: wallpaperStyle }} />

      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-card sm:h-[min(844px,calc(100dvh-2rem))] sm:max-w-[390px] sm:rounded-[44px] sm:border sm:border-border/60 sm:shadow-2xl">

        {/* LOADING */}
        {lockState === "loading" && (
          <div className="flex h-full items-center justify-center bg-stone-950">
            <div className="size-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        )}

        {/* LOCK SETUP */}
        {lockState === "setup" && <LockSetup onComplete={handleSetupComplete} />}

        {/* LOCK SCREEN */}
        {lockState === "locked" && lockConfig && (
          <LockScreen config={lockConfig} weather={weather} time={time} onUnlock={handleUnlock} onReset={handleLockReset} />
        )}

        {/* MAIN APP */}
        {lockState === "unlocked" && (
          <>
            {weatherSearchOpen && (
              <WeatherSearch
                onSelect={(lat, lng) => { loadWeather(lat, lng) }}
                onClose={() => setWeatherSearchOpen(false)}
                onUseDevice={useDeviceLocation}
              />
            )}

            <NotificationPanel open={notifsOpen} notifs={notifs} weather={weather}
              onClose={() => setNotifsOpen(false)} onDismiss={dismissNotif} onClearAll={clearAllNotifs} />

            {!notifsOpen && unreadCount > 0 && screen === "home" && (
              <button onClick={openNotifications}
                className="absolute top-3 right-16 z-30 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-md animate-bounce"
                style={{ animationDuration: "2s" }}>
                {unreadCount} new
              </button>
            )}

            {/* attention banner */}
            {showAttention && <AttentionBanner onDismiss={() => setShowAttention(false)} />}

            <div className="flex flex-1 flex-col overflow-hidden">
              {screen === "home"        && (
                <HomeScreen {...shared}
                  onNotifications={openNotifications}
                  onSettings={() => navigate("settings")}
                  onWeatherSearch={() => setWeatherSearchOpen(true)} />
              )}
              {screen === "lex"         && <LexScreen        {...shared} />}
              {screen === "voice"       && <VoiceScreen      {...shared} />}
              {screen === "focus"       && <FocusScreen      {...shared} />}
              {screen === "space"       && <SpaceScreen      {...shared} />}
              {screen === "drawer"      && <DrawerScreen     {...shared} />}
              {screen === "search"      && <SearchScreen     {...shared} />}
              {screen === "memory"      && <MemoryTreeScreen {...shared} />}
              {screen === "permissions" && <PermissionsScreen {...shared} />}
              {screen === "analysis"    && <AnalysisScreen   {...shared} />}
              {screen === "emergency"   && <EmergencyScreen  {...shared} />}
              {screen === "settings"    && (
                <SettingsScreen {...shared}
                  settings={settings}
                  onSettingsChange={handleSettingsChange}
                  onChangeLock={handleChangeLock} />
              )}
              {screen === "paywall"     && (
                <PaywallScreen {...shared} onSelectPlan={handleSelectPlan} />
              )}
              {screen === "payment"     && (
                <PaymentScreen {...shared}
                  selectedTier={selectedTier}
                  onSuccess={handlePaymentSuccess} />
              )}
            </div>

            {/* single draggable orb — tap = LEX, hold = Emergency */}
            {!noOrb && (
              <DraggableOrb
                navigate={navigate}
                screen={screen}
                onEmergency={() => navigate("emergency")}
                lexUnread={lexUnread}
              />
            )}

            {!noNav && <BottomNav screen={screen} navigate={navigate} lexUnread={lexUnread} />}
            {!noNav && <HomeBar />}
          </>
        )}
      </div>
    </div>
  )
}
