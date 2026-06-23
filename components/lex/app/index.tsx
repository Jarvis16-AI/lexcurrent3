"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import { ErrorBoundary } from "@/components/error-boundary"
import type { Screen, Weather, Msg } from "./types"
import { HomeScreen }       from "./home"
import { NotificationPanel, buildNotifications } from "./notifications"
import type { Notification } from "./notifications"
import { OnboardingScreen, hasCompletedOnboarding } from "./onboarding"
import { getLockConfig, clearLockConfig, type LockConfig } from "../lock/utils"
import {
  type AppSettings,
  loadSettings, saveSettings, applyAllSettings, WALLPAPERS,
} from "@/lib/settings"
import {
  getQuota, incrementQuota, isPremium, getPremiumTier, type PremiumTier,
} from "@/lib/quota"
import { useUser } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { Grid2x2, Star, Search, Sparkles, VolumeX, Mic2 } from "lucide-react"
import { SignIn } from "@clerk/nextjs"
import { AnimatedOrb } from "../animated-orb"
import {
  startGlobalVoiceCommand, stopGlobalVoiceCommand, type VoiceCommandAction,
} from "@/lib/voice-commands"
import { haptic } from "@/lib/haptics"

/* ── Lazily loaded screens — kept below static imports (valid ES module order) ── */
const LexScreen         = dynamic(() => import("./lex-chat").then(m => ({ default: m.LexScreen          })), { ssr: false })
const VoiceScreen       = dynamic(() => import("./voice").then(m => ({ default: m.VoiceScreen            })), { ssr: false })
const FocusScreen       = dynamic(() => import("./focus").then(m => ({ default: m.FocusScreen            })), { ssr: false })
const SpaceScreen       = dynamic(() => import("./space").then(m => ({ default: m.SpaceScreen            })), { ssr: false })
const DrawerScreen      = dynamic(() => import("./drawer").then(m => ({ default: m.DrawerScreen          })), { ssr: false })
const SettingsScreen    = dynamic(() => import("./settings").then(m => ({ default: m.SettingsScreen      })), { ssr: false })
const PaywallScreen     = dynamic(() => import("./paywall").then(m => ({ default: m.PaywallScreen        })), { ssr: false })
const PaymentScreen     = dynamic(() => import("./payment").then(m => ({ default: m.PaymentScreen        })), { ssr: false })
const WeatherSearch     = dynamic(() => import("./weather-search").then(m => ({ default: m.WeatherSearch  })), { ssr: false })
const MemoryTreeScreen  = dynamic(() => import("./memory-tree").then(m => ({ default: m.MemoryTreeScreen  })), { ssr: false })
const PermissionsScreen = dynamic(() => import("./permissions").then(m => ({ default: m.PermissionsScreen })), { ssr: false })
const AnalysisScreen    = dynamic(() => import("./analysis").then(m => ({ default: m.AnalysisScreen      })), { ssr: false })
const SearchScreen      = dynamic(() => import("./search").then(m => ({ default: m.SearchScreen          })), { ssr: false })
const EmergencyScreen   = dynamic(() => import("./emergency").then(m => ({ default: m.EmergencyScreen    })), { ssr: false })
const LockSetup         = dynamic(() => import("../lock/setup").then(m => ({ default: m.LockSetup        })), { ssr: false })
const LockScreen        = dynamic(() => import("../lock/screen").then(m => ({ default: m.LockScreen      })), { ssr: false })

type LockState = "loading" | "auth" | "setup" | "locked" | "unlocked"

/* ── session-cache helpers (prevent flash on media-picker return) ── */
const SESSION_LOCK_KEY = "lex-lock-state-cache"
function cacheLockState(s: LockState) { try { sessionStorage.setItem(SESSION_LOCK_KEY, s) } catch {} }
function getCachedLockState(): LockState | null {
  try { return (sessionStorage.getItem(SESSION_LOCK_KEY) as LockState) || null } catch { return null }
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
/* ── center orb — big sphere centered above the nav bar ────────── */
function CenterOrb({
  navigate, screen, lexUnread, onEmergency,
}: {
  navigate:    (s: Screen) => void
  screen:      Screen
  lexUnread:   number
  onEmergency: () => void
}) {
  const [holding, setHolding] = useState(false)
  const holdTimer             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const moved                 = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    moved.current = false
    holdTimer.current = setTimeout(() => {
      if (!moved.current) { setHolding(false); onEmergency() }
    }, 1800)
    setHolding(true)
  }, [onEmergency])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5) {
      moved.current = true
      setHolding(false)
      if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
    }
  }, [])

  const onPointerUp = useCallback(() => {
    setHolding(false)
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null }
    if (!moved.current) navigate("lex")
  }, [navigate])

  return (
    <div
      className="relative select-none"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      title="Tap for LEX · Hold for Emergency"
    >
      {/* Glow halo */}
      <div className={cn(
        "absolute inset-0 rounded-full blur-xl transition-all duration-500",
        holding          ? "opacity-80 scale-125 bg-red-500/70"    :
        screen === "lex" ? "opacity-60 scale-110 bg-orange-500/60" :
        "opacity-30 bg-orange-500/60",
      )} />

      {/* Sphere body */}
      <div
        className={cn(
          "relative size-[64px] rounded-full cursor-pointer transition-all duration-150",
          holding ? "scale-110" : "hover:scale-105 active:scale-95",
        )}
        style={{
          background: "radial-gradient(circle at 34% 28%, #fcd34d 0%, #f97316 38%, #c2410c 72%, #7c2d12 100%)",
          boxShadow: `0 0 32px rgba(249,115,22,${holding ? "0.75" : screen === "lex" ? "0.55" : "0.38"}), 0 8px 24px rgba(0,0,0,0.5), inset 0 2px 8px rgba(255,255,255,0.30)`,
        }}
      >
        {/* Marbled internal motion */}
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(251,191,36,0.75) 35deg, transparent 80deg, rgba(249,115,22,0.55) 140deg, transparent 195deg, rgba(251,191,36,0.6) 275deg, transparent 360deg)",
            animation: "orb-marble 9s linear infinite",
            mixBlendMode: "soft-light",
          }}
        />
        {/* Gloss highlight */}
        <div className="absolute top-[10px] left-[13px] size-5 rounded-full bg-white/45 blur-[4px]" />
        <div className="absolute top-[14px] left-[16px] size-2.5 rounded-full bg-white/65 blur-[1px]" />
        {/* Emergency ping ring */}
        {holding && <div className="absolute inset-0 rounded-full animate-ping bg-red-500/40" />}
      </div>

      {/* Unread badge */}
      {lexUnread > 0 && screen !== "lex" && !holding && (
        <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none ring-2 ring-card shadow-lg animate-in zoom-in-75 duration-200">
          {lexUnread > 9 ? "9+" : lexUnread}
        </span>
      )}
    </div>
  )
}

function BottomNav({
  screen, navigate, lexUnread, onEmergency,
}: {
  screen:      Screen
  navigate:    (s: Screen) => void
  lexUnread:   number
  onEmergency: () => void
}) {
  const active = "text-primary"
  const idle   = "text-muted-foreground"

  function NavBtn({ to, icon, label }: { to: Screen; icon: React.ReactNode; label: string }) {
    const isActive = screen === to
    return (
      <button
        onClick={() => { haptic("select"); navigate(to) }}
        className="flex flex-col items-center gap-0.5 px-3 active:scale-90 transition-transform duration-100"
      >
        <span className={cn("transition-colors", isActive ? active : idle)}>{icon}</span>
        <span className={cn("text-[9px] font-medium transition-colors", isActive ? "text-primary" : idle)}>{label}</span>
      </button>
    )
  }

  return (
    <div className="relative shrink-0">
      {/* Big center orb — overlaps the nav bar from above */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
        <CenterOrb
          navigate={navigate}
          screen={screen}
          lexUnread={lexUnread}
          onEmergency={onEmergency}
        />
      </div>

      {/* Glassmorphic nav strip */}
      <nav className="flex items-end pb-2 pt-5 bg-card/40 backdrop-blur-xl border-t border-white/10 shadow-[0_-1px_0_rgba(255,255,255,0.05)]">
        {/* Left pair: Search, Apps */}
        <div className="flex flex-1 justify-around">
          <NavBtn to="search"  icon={<Search  className="size-5" />} label="Search" />
          <NavBtn to="drawer"  icon={<Sparkles className="size-5" />} label="Apps" />
        </div>

        {/* Centre gap for orb */}
        <div className="w-16 shrink-0" />

        {/* Right pair: Focus, Home */}
        <div className="flex flex-1 justify-around">
          <NavBtn to="focus" icon={<Star    className="size-5" />} label="Focus" />
          <NavBtn to="home"  icon={<Grid2x2 className="size-5" />} label="Home" />
        </div>
      </nav>
    </div>
  )
}

/* ── Clerk auth screen ─────────────────────────────────────────── */
function LexAuthScreen({ onSignedIn: _onSignedIn }: { onSignedIn: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-stone-950">
      {/* Header */}
      <div className="flex flex-col items-center pt-10 pb-5 px-5">
        <div className="mb-4 relative">
          <div className="flex size-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br from-orange-500/25 to-orange-700/10 border border-orange-500/25 shadow-xl shadow-orange-500/10">
            <AnimatedOrb className="size-11" />
          </div>
          <div className="absolute -bottom-1 -right-1 size-5 flex items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/40">
            <span className="text-[9px] font-bold text-white">AI</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to LEX</h1>
        <p className="mt-1.5 text-center text-sm text-stone-400 leading-relaxed max-w-[260px]">
          Sign in to unlock personalized AI, memory sync, and premium features
        </p>
      </div>

      {/* Clerk widget */}
      <div className="flex-1 flex flex-col items-center px-4">
        <SignIn
          routing="hash"
          fallbackRedirectUrl="/"
          signUpFallbackRedirectUrl="/"
          appearance={{
            variables: {
              colorPrimary:         "#f97316",
              colorBackground:      "#1c1917",
              colorText:            "#f5f5f4",
              colorTextSecondary:   "#a8a29e",
              colorInputBackground: "#292524",
              colorInputText:       "#f5f5f4",
              colorDanger:          "#f87171",
              borderRadius:         "0.875rem",
              fontFamily:           "inherit",
              fontSize:             "0.9rem",
            },
            elements: {
              card:                          "shadow-2xl border border-stone-800 bg-stone-900 w-full",
              headerTitle:                   "hidden",
              headerSubtitle:                "hidden",
              socialButtonsBlockButton:      "border-stone-700 text-stone-200 hover:bg-stone-800 transition-colors",
              socialButtonsBlockButtonText:  "font-medium",
              dividerLine:                   "bg-stone-800",
              dividerText:                   "text-stone-500 text-xs",
              formFieldLabel:                "text-stone-300 text-sm font-medium",
              formFieldInput:                "border-stone-700 bg-stone-800 text-stone-100 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all",
              formFieldErrorText:            "text-red-400 text-xs mt-1",
              formFieldWarningText:          "text-amber-400 text-xs mt-1",
              formButtonPrimary:             "bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-semibold transition-all shadow-md shadow-orange-500/20",
              footerActionLink:              "text-orange-400 hover:text-orange-300 font-medium transition-colors",
              identityPreviewText:           "text-stone-300",
              identityPreviewEditButtonIcon: "text-orange-400",
              alertText:                     "text-red-300 text-sm",
              alertIcon:                     "text-red-400",
            },
          }}
        />
      </div>

      {/* Terms */}
      <div className="py-5 px-5 text-center">
        <p className="text-[11px] text-stone-600 leading-relaxed">
          By continuing you agree to our{" "}
          <a href="/terms" target="_blank" rel="noopener" className="text-orange-500/80 hover:text-orange-400 underline underline-offset-2 transition-colors">
            Terms of Service
          </a>
          {" "}and{" "}
          <a href="/privacy-policy" target="_blank" rel="noopener" className="text-orange-500/80 hover:text-orange-400 underline underline-offset-2 transition-colors">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
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
  const [idle, setIdle]       = useState(false)
  const dragging              = useRef(false)
  const startPt               = useRef({ x: 0, y: 0 })
  const startPos              = useRef({ x: 0, y: 0 })
  const moved                 = useRef(false)
  const containerRef          = useRef<HTMLDivElement>(null)
  const holdTimer             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimer             = useRef<ReturnType<typeof setTimeout> | null>(null)

  function resetIdle() {
    setIdle(false)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdle(true), 5000)
  }

  useEffect(() => {
    const el = containerRef.current?.parentElement
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setPos({ x: width / 2 - 28, y: height - 140 })
    setReady(true)
    resetIdle()
    /* attach pointer listener to parent for idle reset */
    const reset = () => resetIdle()
    el.addEventListener("pointermove", reset, { passive: true })
    el.addEventListener("pointerdown", reset, { passive: true })
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
            "size-14 drop-shadow-2xl transition-all duration-500",
            holding  ? "opacity-100 [filter:hue-rotate(120deg)] scale-125" :
            idle     ? "opacity-20 scale-[0.6]" :
            screen === "lex" ? "opacity-100" : "opacity-85",
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
  const [lockState,   setLockState_]  = useState<LockState>(() => {
    /* use session-cached state so media-picker return doesn't flash loading */
    if (typeof window === "undefined") return "loading"
    /* if Clerk previously timed out, skip straight to auth on this mount */
    try { if (sessionStorage.getItem("lex-clerk-bypass-v1")) return "auth" } catch {}
    const cached = getCachedLockState()
    return cached === "unlocked" ? "unlocked" : "loading"
  })
  const setLockState = (s: LockState) => { cacheLockState(s); setLockState_(s) }
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
  const [screen,    setScreen]    = useState<Screen>("home")
  const [history,   setHistory]   = useState<Screen[]>(["home"])
  const [screenKey,      setScreenKey]      = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)

  /* ── swipe gesture detection ── */
  const swipeTouchStart = useRef<{ x: number; y: number } | null>(null)

  /* ── data ── */
  const [weather,   setWeather]   = useState<Weather | null>(null)
  const [time,      setTime]      = useState<Date | null>(null)
  const [messages,  setMessages]  = useState<Msg[]>([])
  const [thinking,  setThinking]  = useState(false)
  const [thinkText, setThinkText] = useState("")
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

  /* ── weather — with retry and caching ── */
  const loadWeather = useCallback((lat: number | string, lng: number | string) => {
    const cacheKey = `lex-weather-cache-v1`
    const cacheTs  = `lex-weather-ts-v1`

    /* Check if we have a recent cached result (< 30 min) */
    try {
      const ts = parseInt(localStorage.getItem(cacheTs) ?? "0", 10)
      const cachedLat = localStorage.getItem("lex-weather-lat-v1")
      const cachedLng = localStorage.getItem("lex-weather-lng-v1")
      const coordMatch = Math.abs(parseFloat(String(lat)) - parseFloat(cachedLat ?? "0")) < 0.05 &&
                         Math.abs(parseFloat(String(lng)) - parseFloat(cachedLng ?? "0")) < 0.05
      if (Date.now() - ts < 30 * 60 * 1000 && coordMatch) {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
          const d = JSON.parse(cached)
          setWeather(d)
          setNotifs(buildNotifications(d))
          return
        }
      }
    } catch { /* ignore cache errors */ }

    fetch(`/api/weather?lat=${lat}&lng=${lng}`)
      .then(r => r.json())
      .then(d => {
        if (!d.error) {
          setWeather(d)
          setNotifs(buildNotifications(d))
          /* Cache the result */
          try {
            localStorage.setItem(cacheKey, JSON.stringify(d))
            localStorage.setItem(cacheTs, String(Date.now()))
            localStorage.setItem("lex-weather-lat-v1", String(lat))
            localStorage.setItem("lex-weather-lng-v1", String(lng))
          } catch { /* ignore */ }
        }
      })
      .catch(() => {
        /* Try to use cached weather even if stale */
        try {
          const cached = localStorage.getItem(cacheKey)
          if (cached) { const d = JSON.parse(cached); setWeather(d) }
        } catch { /* ignore */ }
      })
  }, [])

  const useDeviceLocation = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => loadWeather(p.coords.latitude, p.coords.longitude),
        _err => {
          /* Location denied — try to use last known cached weather */
          try {
            const cached = localStorage.getItem("lex-weather-cache-v1")
            if (cached) { const d = JSON.parse(cached); setWeather(d) }
          } catch { /* ignore */ }
        },
        { timeout: 8000, maximumAge: 15 * 60 * 1000 }
      )
    }
  }, [loadWeather])

  /* ── Clerk user sync ── */
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  useEffect(() => {
    if (!clerkLoaded || !clerkUser) return
    fetch("/api/user/sync", { method: "POST" }).catch(() => {})
  }, [clerkLoaded, clerkUser])

  /* ── loading timeout — if Clerk takes too long, show the auth screen so
       the user is never permanently stuck on the spinner.
       Clerk keeps resolving in the background; if it resolves with a valid
       user the init effect below will update state to locked/unlocked without
       requiring another sign-in. ── */
  useEffect(() => {
    const BYPASS_KEY = "lex-clerk-bypass-v1"
    /* If a prior mount already set the bypass flag, show auth right away */
    try {
      if (sessionStorage.getItem(BYPASS_KEY)) {
        setLockState_(ls => ls === "loading" ? "auth" : ls)
        return
      }
    } catch {}

    const t = setTimeout(() => {
      try { sessionStorage.setItem(BYPASS_KEY, "1") } catch {}
      setLockState_(ls => ls === "loading" ? "auth" : ls)
      /* NOTE: we do NOT sign out — Clerk continues resolving in the background.
         If the session is valid, the init effect will move us to the correct
         screen automatically. */
    }, 2500)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── init (waits for Clerk to resolve before deciding lock state) ── */
  useEffect(() => {
    if (!clerkLoaded) return  // wait for Clerk to finish loading
    /* Clerk resolved cleanly — clear any stale bypass flag */
    try { sessionStorage.removeItem("lex-clerk-bypass-v1") } catch {}
    const s = loadSettings()
    setSettings_(s)
    applyAllSettings(s)
    if (!clerkUser) {
      /* clear session cache so re-login is required */
      try { sessionStorage.removeItem(SESSION_LOCK_KEY) } catch {}
      setLockState("auth")
      return
    }
    const cfg = getLockConfig()
    if (!cfg?.isSetup) { setLockState("setup") }
    else if (cfg.lockType === "none") { setLockConfig_(cfg); setLockState("unlocked") }
    else {
      setLockConfig_(cfg)
      /* if we have a valid cached "unlocked" state, stay unlocked (e.g. media picker return) */
      const cached = getCachedLockState()
      setLockState(cached === "unlocked" ? "unlocked" : "locked")
    }
  }, [clerkLoaded, clerkUser])

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
    haptic("navigate")
    setScreenKey(k => k + 1)
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
    haptic("navigate")
    setScreenKey(k => k + 1)
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

  /* ── active audio ref — used to cancel ongoing speech before a new one starts ── */
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)
  const [ttsPlaying, setTTSPlaying] = useState(false)

  const stopTTS = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause()
      activeAudioRef.current = null
    }
    setTTSPlaying(false)
  }, [])

  /* ── TTS (Edge TTS only — no browser speech synthesis fallback) ── */
  const speakReply = useCallback(async (text: string) => {
    const s = loadSettings()
    if (!s.voiceEnabled || !s.autoSpeak || s.dnd) return

    /* Stop any currently-playing reply before starting the next */
    if (activeAudioRef.current) {
      activeAudioRef.current.pause()
      activeAudioRef.current = null
    }
    setTTSPlaying(false)

    const snippet = text.slice(0, 400)
    try {
      const res = await fetch("/api/voice", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: snippet, voiceId: s.voiceId }),
      })
      if (!res.ok) return   /* tier restriction or server error — fail silently */

      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const audio = new Audio(url)
      activeAudioRef.current = audio
      setTTSPlaying(true)
      audio.onended = () => { URL.revokeObjectURL(url); activeAudioRef.current = null; setTTSPlaying(false) }
      audio.onerror = () => { URL.revokeObjectURL(url); activeAudioRef.current = null; setTTSPlaying(false) }
      await audio.play()
    } catch { setTTSPlaying(false) /* network error — fail silently */ }
  }, [])

  /* ── build context for LEX including memories, settings, time and activity ── */
  const getCtx = useCallback(async (w: Weather | null): Promise<string> => {
    const s   = loadSettings()
    const now = new Date()
    const hour     = now.getHours()
    const dateStr  = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    const timeStr  = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    const timeOfDay =
      hour >= 5  && hour < 12 ? "morning"   :
      hour >= 12 && hour < 17 ? "afternoon" :
      hour >= 17 && hour < 21 ? "evening"   : "night"

    const ctxLines: string[] = [
      `Current date & time: ${dateStr} at ${timeStr} (${timeOfDay}).`,
    ]

    /* Weather — include detailed conditions if available */
    if (w) {
      const weatherLine = `Location: ${w.city}${w.country ? `, ${w.country}` : ""}. ` +
        `Weather: ${w.temp}${w.unit}, feels like ${w.feelsLike}${w.unit}, ${w.label}. ` +
        `Humidity ${w.humidity}%, wind ${w.wind} km/h. High ${w.high}${w.unit}, Low ${w.low}${w.unit}.`
      ctxLines.push(weatherLine)
    }

    /* Current screen context — tells LEX what the user is actively looking at */
    const screenContext: Record<string, string> = {
      home:        "User is on the home screen",
      lex:         "User is chatting with LEX",
      voice:       "User is in voice conversation mode",
      focus:       "User is in Focus mode (productivity)",
      space:       "User is in the Space / exploration screen",
      drawer:      "User is browsing the app drawer",
      settings:    "User is in Settings",
      memory:      "User is viewing their Memory Tree",
      analysis:    "User is reviewing their personal analysis / screen time",
      search:      "User is using the universal search",
      permissions: "User is reviewing AI permissions",
      emergency:   "User is in the emergency screen",
    }
    const ctxScreen = screenContext[screen] ?? `User is on the ${screen} screen`
    ctxLines.push(`Current activity: ${ctxScreen}.`)

    /* User preferences */
    ctxLines.push(
      `User preferences: AI personality = ${s.aiPersonality ?? "friendly"}, theme = ${s.theme ?? "dark"}.`
    )

    /* Memory — fetch and inject with recency weighting */
    try {
      const res  = await fetch("/api/memory")
      if (res.ok) {
        const data = await res.json()
        const mems: Array<{ category: string; content: string; confidence: number; last_reinforced?: string }> = data.memories ?? []
        if (mems.length > 0) {
          /* Sort by confidence + recency, cap at 5 per category */
          const sorted = [...mems].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
          const grouped = sorted.reduce<Record<string, string[]>>((acc, m) => {
            if (!acc[m.category]) acc[m.category] = []
            if (acc[m.category].length < 4) acc[m.category].push(m.content)
            return acc
          }, {})
          const memLines = Object.entries(grouped).map(([c, items]) => `  ${c}: ${items.join("; ")}`)
          ctxLines.push(`\nKnown facts from user memory:\n${memLines.join("\n")}`)
        }
      }
    } catch { /* ignore — memory is enhancement, not required */ }

    /* What LEX cannot access — prevents hallucination */
    ctxLines.push(
      "\nNot available to LEX (do not fabricate): tasks, reminders, health metrics, contacts, calendar events, SMS, emails, app list, files."
    )

    return ctxLines.join("\n").trim()
  }, [screen])

  /* ── send message (with quota guard + memory extraction) ── */
  const sendMessage = useCallback(async (text: string, imageDataUrl?: string) => {
    const clean = text.trim()
    if (!clean || thinking) return

    if (!isPremium()) {
      const q = getQuota()
      if (q.exhausted) { navigate("paywall"); return }
    }

    const userMsg: Msg = { role: "user", content: clean, ...(imageDataUrl ? { imageDataUrl } : {}) }
    setMessages(prev => [...prev, userMsg])
    setThinking(true)
    setThinkText("")
    navigate("lex")
    incrementQuota()

    try {
      const s         = loadSettings()
      const ctx       = await getCtx(weather)
      const tierVal   = getPremiumTier() ?? "free"
      const modelId   = s.aiModel ?? "lex-flash"
      const useStream = modelId === "lex-reason"

      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          context:  ctx,
          modelId,
          tier:     tierVal,
          personality: s.aiPersonality,
          stream: useStream,
        }),
      })

      let reply = ""

      if (useStream && res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
        /* ── Parse SSE stream, extract <think> blocks live ── */
        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let lineBuf = ""
        let full    = ""

        const pump = async (): Promise<void> => {
          const { done, value } = await reader.read()
          if (done) return
          lineBuf += decoder.decode(value, { stream: true })
          const lines = lineBuf.split("\n")
          lineBuf = lines.pop() ?? ""
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const raw = line.slice(6).trim()
            if (raw === "[DONE]") return
            try { full += (JSON.parse(raw) as { text?: string }).text ?? "" } catch { /* skip */ }
          }
          /* live-update think text */
          const tStart = full.indexOf("<think>")
          const tEnd   = full.indexOf("</think>")
          if (tStart >= 0) {
            const inner = full.slice(tStart + 7, tEnd >= 0 ? tEnd : undefined)
            setThinkText(inner.trim())
          }
          return pump()
        }
        await pump()

        /* extract clean reply after </think> */
        const tEnd = full.indexOf("</think>")
        reply = tEnd >= 0
          ? full.slice(tEnd + 8).trim()
          : full.replace(/<think>[\s\S]*/i, "").trim() || full
      } else {
        const data = await res.json()
        reply = (data.reply as string) ?? "Sorry, I couldn't process that."
      }

      setThinkText("")
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

      /* async: extract memories from this exchange — no userId in body, auth derives it server-side */
      fetch("/api/memory", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: clean, assistantReply: reply }),
      }).catch(() => {})
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection issue — please try again." }])
    } finally {
      setThinking(false)
      setThinkText("")
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
    /* stop any ongoing TTS before recording — voice interruption */
    stopTTS()
    haptic("tap")
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

  /* ── Voice command state + handlers ───────────────────────────── */
  const [vcListening, setVcListening] = useState(false)
  const [vcWallpaper, setVcWallpaper] = useState<string | null>(null)
  const [vcToast,     setVcToast]     = useState<string | null>(null)

  const showVcToast = useCallback((msg: string) => {
    setVcToast(msg)
    setTimeout(() => setVcToast(null), 2500)
  }, [])

  const handleVoiceCommand = useCallback((action: VoiceCommandAction, raw: string) => {
    setVcListening(false)
    switch (action.type) {
      case "navigate":
        navigate(action.screen)
        showVcToast(`Opened ${action.screen}`)
        break
      case "go_back":
        goBack()
        break
      case "stop_tts":
        stopTTS()
        showVcToast("Stopped speaking")
        break
      case "set_wallpaper":
        setVcWallpaper(action.color)
        showVcToast(`Wallpaper → ${action.label}`)
        break
      case "toggle_focus":
        navigate("focus")
        showVcToast("Focus mode")
        break
      case "toggle_dnd": {
        const s    = loadSettings()
        const next = { ...s, dnd: action.enable }
        handleSettingsChange(next)
        showVcToast(action.enable ? "Do not disturb on" : "Do not disturb off")
        break
      }
      case "chat_message":
        navigate("lex")
        setTimeout(() => sendMessage(action.text), 300)
        showVcToast(`Asking LEX…`)
        break
      case "none":
        navigate("lex")
        setTimeout(() => sendMessage(raw), 300)
        break
    }
  }, [navigate, goBack, stopTTS, sendMessage, showVcToast])

  const handleVoiceCommandTap = useCallback(() => {
    if (vcListening) { stopGlobalVoiceCommand(); setVcListening(false); return }
    setVcListening(true)
    const ok = startGlobalVoiceCommand(handleVoiceCommand, (l) => setVcListening(l))
    if (!ok) { setVcListening(false); alert("Voice commands require a browser that supports SpeechRecognition (Chrome/Edge).") }
  }, [vcListening, handleVoiceCommand])

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
  const handleSetupComplete = useCallback((cfg: LockConfig) => {
    setLockConfig_(cfg)
    setLockState("unlocked")
    if (!hasCompletedOnboarding()) setShowOnboarding(true)
  }, [])
  const handleUnlock = useCallback(() => {
    setLockState("unlocked")
    if (!hasCompletedOnboarding()) setShowOnboarding(true)
  }, [])
  const handleLockReset     = useCallback(() => { setLockConfig_(null); setLockState("setup") }, [])
  const handleChangeLock    = useCallback(() => { clearLockConfig(); setLockConfig_(null); setLockState("setup") }, [])

  /* ── payment handlers ── */
  const handleSelectPlan     = useCallback((tier: PremiumTier) => { setSelectedTier(tier); navigate("payment") }, [navigate])
  const handlePaymentSuccess = useCallback(() => { navigate("home") }, [navigate])

  /* ── wallpaper (preset gradient or custom photo from gallery) ── */
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null)

  useEffect(() => {
    /* load persisted custom wallpaper on mount */
    try {
      const stored = localStorage.getItem("lex-custom-wallpaper-v1")
      if (stored) setCustomWallpaper(stored)
    } catch { /* ignore */ }

    /* listen for gallery picks from the settings screen */
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ type: string; dataUrl?: string }>
      if (ev.detail.type === "custom" && ev.detail.dataUrl) {
        setCustomWallpaper(ev.detail.dataUrl)
      } else if (ev.detail.type === "preset") {
        setCustomWallpaper(null)
      }
    }
    window.addEventListener("lex-wallpaper-change", handler)
    return () => window.removeEventListener("lex-wallpaper-change", handler)
  }, [])

  /* Wallpaper applied directly to the card so it's always visible */
  const cardBgStyle: React.CSSProperties = customWallpaper
    ? { backgroundImage: `url(${customWallpaper})`, backgroundSize: "cover", backgroundPosition: "center" }
    : vcWallpaper
    ? { background: vcWallpaper }
    : { background: WALLPAPERS[settings.wallpaper]?.gradient ?? WALLPAPERS.amber.gradient }

  const clearMessages = useCallback(() => setMessages([]), [])

  const shared = {
    screen, navigate, goBack, weather, time, messages, thinking, thinkText, recording,
    ttsPlaying, stopTTS, sendMessage, startVoice, stopVoice,
    startVoiceCommand: handleVoiceCommandTap,
    clearMessages,
  }
  const noNav  = ["voice","settings","paywall","payment","emergency"].includes(screen)

  return (
    <div className="flex h-dvh w-screen items-center justify-center overflow-hidden bg-stone-950 sm:p-4">

      <div
        className="relative z-10 flex h-full w-full flex-col overflow-hidden sm:h-[min(844px,calc(100dvh-2rem))] sm:max-w-[390px] sm:rounded-[44px] sm:border sm:border-border/60 sm:shadow-2xl"
        style={lockState === "unlocked" ? cardBgStyle : undefined}
        onTouchStart={e => {
          if (lockState !== "unlocked") return
          swipeTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }}
        onTouchEnd={e => {
          if (!swipeTouchStart.current || lockState !== "unlocked") return
          const dx = e.changedTouches[0].clientX - swipeTouchStart.current.x
          const dy = e.changedTouches[0].clientY - swipeTouchStart.current.y
          swipeTouchStart.current = null
          /* only fast, strongly-horizontal swipes */
          if (Math.abs(dx) < 72 || Math.abs(dy) > Math.abs(dx) * 0.6) return
          /* right swipe → go back (not from home or voice) */
          if (dx > 0 && !["home", "voice", "emergency"].includes(screen)) {
            goBack()
          }
        }}
      >

        {/* LOADING */}
        {lockState === "loading" && (
          <div className="flex h-full items-center justify-center bg-stone-950">
            <div className="size-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        )}

        {/* CLERK AUTH */}
        {lockState === "auth" && (
          <LexAuthScreen onSignedIn={() => {
            const cfg = getLockConfig()
            if (!cfg?.isSetup) { setLockState("setup") }
            else { setLockConfig_(cfg); setLockState("locked") }
          }} />
        )}

        {/* LOCK SETUP */}
        {lockState === "setup" && <LockSetup onComplete={handleSetupComplete} />}

        {/* LOCK SCREEN */}
        {lockState === "locked" && lockConfig && (
          <LockScreen config={lockConfig} weather={weather} time={time} onUnlock={handleUnlock} onReset={handleLockReset} />
        )}

        {/* MAIN APP */}
        {lockState === "unlocked" && showOnboarding && (
          <OnboardingScreen
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onComplete={() => setShowOnboarding(false)}
          />
        )}

        {lockState === "unlocked" && !showOnboarding && (
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

            {/* voice command toast */}
            {vcToast && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-card/95 border border-border/80 px-4 py-1.5 shadow-lg text-xs font-semibold text-foreground backdrop-blur-sm pointer-events-none whitespace-nowrap">
                ✓ {vcToast}
              </div>
            )}

            {/* global voice command FAB */}
            {!["voice", "emergency"].includes(screen) && (
              <button
                onClick={handleVoiceCommandTap}
                className={cn(
                  "absolute top-2 left-2 z-40 flex size-8 items-center justify-center rounded-full border shadow-md transition-all active:scale-90",
                  vcListening
                    ? "bg-primary border-primary text-primary-foreground animate-pulse"
                    : "bg-card/75 border-border/50 text-muted-foreground hover:text-primary backdrop-blur-sm hover:bg-card/90"
                )}
                title={vcListening ? "Listening for command…" : "Voice command — say: open settings, set wallpaper blue, enable focus…"}
              >
                <Mic2 className="size-4" />
              </button>
            )}

            {/* TTS stop pill — visible whenever speech is playing */}
            {ttsPlaying && (
              <button
                onClick={stopTTS}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-card border border-border/80 px-4 py-2 shadow-xl text-xs font-semibold text-foreground hover:bg-accent active:scale-95 transition-all backdrop-blur-sm"
              >
                <VolumeX className="size-3.5 text-primary" />
                Stop speaking
              </button>
            )}

            <div className="flex flex-1 flex-col overflow-hidden">
              <ErrorBoundary context={`screen:${screen}`}>
              <div key={screenKey} className="lex-screen-enter flex flex-1 flex-col overflow-hidden">
                {screen === "home"        && (
                  <HomeScreen {...shared}
                    onNotifications={openNotifications}
                    onSettings={() => navigate("settings")}
                    onWeatherSearch={() => setWeatherSearchOpen(true)}
                    showBatteryPercent={settings.showBatteryPercent} />
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
              </ErrorBoundary>
            </div>

            {!noNav && <BottomNav screen={screen} navigate={navigate} lexUnread={lexUnread} onEmergency={() => navigate("emergency")} />}
            {!noNav && <HomeBar />}
          </>
        )}
      </div>
    </div>
  )
}
