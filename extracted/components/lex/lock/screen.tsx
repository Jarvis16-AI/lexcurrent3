"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import Image from "next/image"
import {
  Lock, ChevronUp, Mail, RefreshCw,
  Camera, Sparkles, Bell, Target, Sun,
  Droplets, Wind, BatteryLow, BatteryMedium, BatteryFull,
  ScanFace, UserCheck, Zap, ZapOff,
  Moon, Sunrise, Sunset, CloudSun,
} from "lucide-react"
import { useUser } from "@clerk/nextjs"
import type { LockConfig } from "./utils"
import { verifyHash, clearLockConfig } from "./utils"
import { PinPad }      from "./pin"
import { PatternLock } from "./pattern"
import { FaceVerify }  from "./face-enroll"
import type { Weather } from "../app/types"
import {
  loadLockSettings, LOCK_WALLPAPERS, BLUR_CLASSES, BLUR_BG, ANIM_CLASSES,
  loadGoals, loadReminders, loadNotifications, clearNotifications,
  loadCustomLockWallpaper,
  type LockScreenSettings, type LockGoal, type LockReminder, type LockNotification,
  type LockClockStyle,
} from "@/lib/lock-screen-settings"
import { getPremiumTier, hasAtLeast } from "@/lib/quota"
import { cn } from "@/lib/utils"

type Panel = "idle" | "unlock" | "face-verify" | "recovery" | "recovery-email"

interface LockScreenProps {
  config:   LockConfig
  weather:  Weather | null
  time:     Date | null
  onUnlock: () => void
  onReset:  () => void
}

const CLOCK_STYLES: { key: LockClockStyle; label: string; className: string }[] = [
  { key: "thin",  label: "Thin",  className: "font-thin tracking-tight"     },
  { key: "bold",  label: "Bold",  className: "font-black tracking-tighter"  },
  { key: "mono",  label: "Mono",  className: "font-mono font-medium"        },
  { key: "serif", label: "Serif", className: "font-serif font-light italic" },
]

/* ── Big Clock ───────────────────────────────────────────────── */
function BigClock({ time, style }: { time: Date | null; style: LockClockStyle }) {
  const t    = time ?? new Date()
  const hh   = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const date = t.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
  const cls  = CLOCK_STYLES.find(s => s.key === style)?.className ?? CLOCK_STYLES[0].className
  return (
    <div className="text-center text-white">
      <p className={cn("text-7xl tabular-nums leading-none", cls)}>{hh}</p>
      <p className="mt-2 text-base font-light opacity-80">{date}</p>
    </div>
  )
}

/* ── AI Widgets (Pro+) ───────────────────────────────────────── */
function BatteryWidget() {
  const [level,    setLevel]    = useState<number | null>(null)
  const [charging, setCharging] = useState(false)

  useEffect(() => {
    if (!("getBattery" in navigator)) return
    // @ts-ignore — Battery Status API
    navigator.getBattery().then((bat: { level: number; charging: boolean; addEventListener: Function }) => {
      setLevel(Math.round(bat.level * 100))
      setCharging(bat.charging)
      bat.addEventListener("levelchange", () => setLevel(Math.round(bat.level * 100)))
      bat.addEventListener("chargingchange", () => setCharging(bat.charging))
    }).catch(() => {})
  }, [])

  if (level === null) return null

  const Icon = level > 70 ? BatteryFull : level > 30 ? BatteryMedium : BatteryLow
  const color = level > 70 ? "text-green-400" : level > 20 ? "text-yellow-400" : "text-red-400"

  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("size-4", color)} />
      <span className="text-xs text-white/80 font-medium">
        {level}%{charging ? " ⚡" : ""}
      </span>
    </div>
  )
}

function AIWidgetsPanel({ weather, blur, bg }: { weather: Weather | null; blur: string; bg: string }) {
  return (
    <div className="space-y-2">
      {weather && (
        <div className={cn("rounded-2xl border border-white/15 px-4 py-3", blur, bg)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{weather.icon}</span>
              <div>
                <p className="text-white font-semibold text-lg leading-tight">
                  {weather.temp}{weather.unit}
                </p>
                <p className="text-white/60 text-xs">{weather.label}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-xs">H:{weather.high}° L:{weather.low}°</p>
              <p className="text-white/50 text-[10px]">{weather.city}</p>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-white/10 flex gap-4">
            <div className="flex items-center gap-1.5 text-white/70">
              <Droplets className="size-3.5 text-blue-300" />
              <span className="text-xs">{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/70">
              <Wind className="size-3.5 text-cyan-300" />
              <span className="text-xs">{weather.wind} km/h</span>
            </div>
            <BatteryWidget />
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Context Cards (Pro+) ────────────────────────────────────── */
function ContextCard({ time, blur, bg }: { time: Date | null; blur: string; bg: string }) {
  const h = (time ?? new Date()).getHours()
  const greetingData = h < 5
    ? { icon: <Moon    className="size-4 text-indigo-300" />, text: "Late night — stay focused" }
    : h < 12
    ? { icon: <Sunrise className="size-4 text-amber-400" />, text: "Good morning, let's do this" }
    : h < 17
    ? { icon: <Sun     className="size-4 text-yellow-400" />, text: "Good afternoon" }
    : h < 21
    ? { icon: <Sunset  className="size-4 text-orange-400" />, text: "Good evening" }
    : { icon: <Moon    className="size-4 text-indigo-300" />, text: "Winding down" }

  const totalMemories = (() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("lex-"))
      return keys.length
    } catch { return 0 }
  })()

  return (
    <div className={cn("rounded-2xl border border-white/15 px-4 py-3", blur, bg)}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-4 text-yellow-400" />
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">LEX Context</span>
      </div>
      <p className="text-sm text-white font-medium flex items-center gap-2">
        {greetingData.icon}
        {greetingData.text}
      </p>
      <p className="text-xs text-white/50 mt-0.5">
        LEX has {totalMemories} data points about you
      </p>
    </div>
  )
}

/* ── Smart Reminders (Plus+) ─────────────────────────────────── */
function SmartReminderCard({ reminders, time, blur, bg }: {
  reminders: LockReminder[]
  time: Date | null
  blur: string
  bg: string
}) {
  if (!reminders.length) return null

  const now = time ?? new Date()
  const hhmm = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })

  const upcoming = reminders
    .filter(r => r.time >= hhmm)
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 2)

  if (!upcoming.length) return null

  return (
    <div className={cn("rounded-2xl border border-white/15 px-4 py-3", blur, bg)}>
      <div className="flex items-center gap-2 mb-2">
        <Bell className="size-4 text-blue-400" />
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Reminders</span>
      </div>
      {upcoming.map(r => (
        <div key={r.id} className="flex items-center gap-2 py-0.5">
          <span className="text-xs text-white/50 w-10 shrink-0 tabular-nums">{r.time}</span>
          <span className="text-sm text-white truncate">{r.text}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Daily Briefing (Plus+) ──────────────────────────────────── */
function DailyBriefingCard({ weather, time, blur, bg }: {
  weather: Weather | null
  time: Date | null
  blur: string
  bg: string
}) {
  const h = (time ?? new Date()).getHours()
  if (h < 5 || h > 11) return null  // only show in morning

  return (
    <div className={cn("rounded-2xl border border-yellow-500/30 px-4 py-3", blur, "bg-yellow-500/10")}>
      <div className="flex items-center gap-2 mb-1.5">
        <Sun className="size-4 text-yellow-400" />
        <span className="text-xs font-semibold text-yellow-300 uppercase tracking-wide">Morning Briefing</span>
      </div>
      <p className="text-sm text-white font-medium">
        {weather
          ? `Today in ${weather.city}: ${weather.label}, ${weather.temp}${weather.unit}. H${weather.high}° L${weather.low}°.`
          : "Have a great day today. Stay focused and make progress on your goals."}
      </p>
      <p className="text-[11px] text-white/50 mt-1">LEX Daily Briefing</p>
    </div>
  )
}

/* ── Goal Tracking (Ultra) ───────────────────────────────────── */
function GoalTrackingPanel({ goals, blur, bg }: { goals: LockGoal[]; blur: string; bg: string }) {
  if (!goals.length) return null

  return (
    <div className={cn("rounded-2xl border border-white/15 px-4 py-3", blur, bg)}>
      <div className="flex items-center gap-2 mb-3">
        <Target className="size-4 text-red-400" />
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wide">Goals</span>
      </div>
      <div className="space-y-2.5">
        {goals.slice(0, 3).map(g => (
          <div key={g.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-white/90 truncate max-w-[75%]">{g.title}</span>
              <span className="text-[11px] text-white/50 shrink-0">{g.progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${g.progress}%`,
                  background: g.progress >= 80
                    ? "#22c55e"
                    : g.progress >= 40
                    ? "#f59e0b"
                    : "#ef4444",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Notification Preview ────────────────────────────────────── */
function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)   return "now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function NotificationPreviewPanel({
  notifs, blur, bg, onClear,
}: {
  notifs: LockNotification[]
  blur:   string
  bg:     string
  onClear: () => void
}) {
  if (!notifs.length) return null

  const shown = notifs.slice(0, 3)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1 mb-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Notifications
        </span>
        <button
          onClick={onClear}
          className="text-[10px] text-white/40 hover:text-white/70 transition-colors"
        >
          Clear
        </button>
      </div>
      {shown.map((n, i) => (
        <div
          key={n.id}
          className={cn(
            "flex items-start gap-3 rounded-2xl border border-white/10 px-3.5 py-3 transition-all",
            "animate-in fade-in slide-in-from-bottom-2",
            blur, bg,
          )}
          style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
        >
          {/* app icon */}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg leading-none">
            {n.icon}
          </div>

          {/* body */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wide">
                {n.app}
              </span>
              <span className="text-[10px] text-white/35 shrink-0 tabular-nums">
                {timeAgo(n.time)}
              </span>
            </div>
            <p className="text-sm font-medium text-white leading-snug">
              {n.title}
            </p>
            <p className="text-xs text-white/55 leading-snug mt-0.5 line-clamp-2">
              {n.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}


/* ── Premium lock badge ──────────────────────────────────────── */
function PremiumBadge({ plan }: { plan: string }) {
  return (
    <span className="text-[9px] font-bold text-yellow-400 border border-yellow-500/50 rounded-full px-1.5 py-0.5">
      {plan}
    </span>
  )
}

/* ════════════════════════════════════════════════════════════════
   MAIN LOCK SCREEN
   ════════════════════════════════════════════════════════════════ */
export function LockScreen({ config, weather, time, onUnlock, onReset }: LockScreenProps) {
  const [panel,      setPanel]      = useState<Panel>("idle")
  const [error,      setError]      = useState("")
  const [pwInput,    setPwInput]    = useState("")
  const [emailInput, setEmailInput] = useState("")
  const [attempts,   setAttempts]   = useState(0)
  const [torchOn,    setTorchOn]    = useState(false)
  const [panelKey,   setPanelKey]   = useState(0)
  const streamRef                   = useRef<MediaStream | null>(null)
  const cameraRef                   = useRef<HTMLInputElement>(null)
  const { user: clerkUser, isSignedIn } = useUser()

  /* load lock screen settings + premium state */
  const [ls, setLs]             = useState<LockScreenSettings>(() => loadLockSettings())
  const [goals, setGoals]       = useState<LockGoal[]>([])
  const [reminders, setRems]    = useState<LockReminder[]>([])
  const [notifs, setNotifs]     = useState<LockNotification[]>([])
  const tier                    = getPremiumTier()

  useEffect(() => {
    const settings = loadLockSettings()
    setLs(settings)
    setGoals(loadGoals())
    setRems(loadReminders())
    setNotifs(loadNotifications())
  }, [])

  const handleClearNotifs = () => {
    clearNotifications()
    setNotifs([])
  }

  const wpKey = ls.wallpaper === "custom" ? "default" : ls.wallpaper
  const wp    = LOCK_WALLPAPERS[wpKey]
  const customBg = ls.wallpaper === "custom" ? loadCustomLockWallpaper() : null
  const blur = BLUR_CLASSES[ls.blurStrength]
  const bg   = BLUR_BG[ls.blurStrength]
  const animCls = ANIM_CLASSES[ls.unlockAnimation]

  const showUnlock = () => { setPanel("unlock"); setError(""); setPanelKey(k => k + 1) }

  const toggleFlashlight = async () => {
    try {
      if (torchOn) {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        setTorchOn(false)
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      streamRef.current = stream
      const [track] = stream.getVideoTracks()
      // @ts-ignore — torch constraint
      await track.applyConstraints({ advanced: [{ torch: true }] })
      setTorchOn(true)
    } catch {
      alert("Flashlight not available on this device/browser.")
    }
  }

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  /* ── verify ── */
  const verify = useCallback(async (value: string) => {
    const ok = await verifyHash(value, config.lockHash)
    if (ok) {
      setError(""); setAttempts(0); onUnlock()
    } else {
      const next = attempts + 1
      setAttempts(next)
      setError(`Incorrect — ${next >= 5 ? "too many attempts, try recovery" : `${5 - next} attempts left`}`)
    }
  }, [config.lockHash, attempts, onUnlock])

  /* ── Face ID (camera-based) — handled by FaceVerify panel ── */

  /* ── Email recovery ── */
  const handleEmailRecovery = () => {
    if (!emailInput.trim()) { setError("Enter your recovery email."); return }
    if (emailInput.toLowerCase().trim() !== config.recoveryEmail.toLowerCase().trim()) {
      setError("Email does not match your recovery email."); return
    }
    clearLockConfig(); onReset()
  }

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={
        customBg
          ? { backgroundImage: `url(${customBg})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: wp.gradient }
      }
    >
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-1/3 -translate-x-1/2 size-72 rounded-full blur-3xl"
          style={{ background: wp.glow }}
        />
        <div
          className="absolute bottom-1/4 left-1/4 size-48 rounded-full blur-3xl"
          style={{ background: wp.glow, opacity: 0.6 }}
        />
      </div>

      {/* ═══ IDLE PANEL ═══ */}
      {panel === "idle" && (
        <div className="relative flex h-full flex-col justify-between py-10 px-5">

          {/* corner quick apps (absolute, not in scroll flow) */}
          {ls.quickApps && (
            <>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" />
              {/* flashlight — bottom-left */}
              <button
                onClick={toggleFlashlight}
                className={cn(
                  "absolute bottom-24 left-5 z-10 flex flex-col items-center gap-1 rounded-2xl border border-white/20 px-4 py-3 transition-all active:scale-95",
                  torchOn ? "bg-yellow-500/30 border-yellow-500/50" : (blur + " " + bg),
                )}
              >
                {torchOn
                  ? <Zap className="size-5 text-yellow-300" fill="currentColor" />
                  : <ZapOff className="size-5 text-white/70" />
                }
                <span className="text-[9px] font-medium text-white/50">{torchOn ? "On" : "Flash"}</span>
              </button>
              {/* camera — bottom-right */}
              <button
                onClick={() => cameraRef.current?.click()}
                className={cn(
                  "absolute bottom-24 right-5 z-10 flex flex-col items-center gap-1 rounded-2xl border border-white/20 px-4 py-3 transition-all active:scale-95",
                  blur, bg,
                )}
              >
                <Camera className="size-5 text-white/70" />
                <span className="text-[9px] font-medium text-white/50">Camera</span>
              </button>
            </>
          )}

          {/* ── top: big clock ── */}
          <div className="flex flex-col items-center gap-5">
            <BigClock time={time} style={ls.clockStyle ?? "thin"} />
          </div>

          {/* ── middle: premium widgets (scrollable) ── */}
          <div className="flex-1 overflow-y-auto py-4 space-y-2.5 no-scrollbar">

            {/* Daily Briefing — Plus+ */}
            {ls.dailyBriefing && hasAtLeast("plus") && (
              <DailyBriefingCard weather={weather} time={time} blur={blur} bg={bg} />
            )}

            {/* AI Widgets — Pro+ */}
            {ls.aiWidgets && hasAtLeast("pro") && (
              <AIWidgetsPanel weather={weather} blur={blur} bg={bg} />
            )}

            {/* Context Cards — Pro+ */}
            {ls.contextCards && hasAtLeast("pro") && (
              <ContextCard time={time} blur={blur} bg={bg} />
            )}

            {/* Smart Reminders — Plus+ */}
            {ls.smartReminders && hasAtLeast("plus") && (
              <SmartReminderCard reminders={reminders} time={time} blur={blur} bg={bg} />
            )}

            {/* Goal Tracking — Ultra */}
            {ls.goalTracking && hasAtLeast("ultra") && (
              <GoalTrackingPanel goals={goals} blur={blur} bg={bg} />
            )}

            {/* Weather (always shown if available, even without AI widgets) */}
            {!ls.aiWidgets && weather && (
              <div className={cn("flex items-center gap-3 rounded-2xl border border-white/15 px-5 py-3 mx-2", blur, bg)}>
                <span className="text-3xl">{weather.icon}</span>
                <div className="text-white">
                  <p className="text-lg font-semibold">{weather.temp}{weather.unit} · {weather.label}</p>
                  <p className="text-xs opacity-70">{weather.city} · H{weather.high}° L{weather.low}°</p>
                </div>
              </div>
            )}

            {/* Notification Preview — free feature */}
            {ls.notifPreview && notifs.length > 0 && (
              <NotificationPreviewPanel
                notifs={notifs}
                blur={blur}
                bg={bg}
                onClear={handleClearNotifs}
              />
            )}
          </div>

          {/* ── bottom: unlock buttons ── */}
          <div className="flex flex-col items-center gap-3">
            {/* Face ID shortcut — if enrolled */}
            {config.faceAsComplement && (
              <button
                onClick={() => setPanel("face-verify")}
                className={cn(
                  "flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 hover:bg-white/15 active:scale-95 transition-all",
                  blur, bg
                )}
              >
                <ScanFace className="size-4" />
                Face ID
              </button>
            )}
            <button
              onClick={showUnlock}
              className="flex flex-col items-center gap-3 group active:scale-95 transition-transform"
            >
              <div className={cn(
                "flex size-14 items-center justify-center rounded-full border-2 border-white/30 transition-colors group-hover:bg-white/20",
                blur, bg,
              )}>
                <Lock className="size-6 text-white" />
              </div>
              <div className="flex items-center gap-1.5 text-white/70">
                <ChevronUp className="size-4 animate-bounce" />
                <span className="text-sm font-light">Tap to unlock</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ═══ UNLOCK PANEL ═══ */}
      {panel === "unlock" && (
        <div key={panelKey} className={cn("relative flex h-full flex-col", animCls)}>
          <div className="flex items-center justify-center px-5 pt-8 pb-4">
            <BigClock time={time} style={ls.clockStyle ?? "thin"} />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-5">
            {config.lockType === "face" && (
              <div className="flex flex-col items-center gap-4">
                <Image src="/lex-orb.png" alt="Face ID" width={80} height={80} className="rounded-full shadow-2xl opacity-90" />
                <p className="text-white/80 text-sm">Looking for your face…</p>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button onClick={verifyFace} className={cn(
                  "rounded-full border border-white/30 px-6 py-2.5 text-sm text-white hover:bg-white/20 transition-colors",
                  blur, bg,
                )}>
                  Try Face ID
                </button>
              </div>
            )}
            {config.lockType === "pin" && (
              <div className="w-full">
                <PinPad mode="verify" onComplete={verify} error={error} label="Enter PIN" />
              </div>
            )}
            {config.lockType === "pattern" && (
              <PatternLock mode="verify" onComplete={verify} error={error} />
            )}
            {config.lockType === "password" && (
              <div className="flex w-full flex-col gap-4">
                <p className={cn("text-sm text-center", error ? "text-red-400" : "text-white/70")}>
                  {error || "Enter your password"}
                </p>
                <input
                  type="password"
                  value={pwInput}
                  onChange={e => setPwInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && verify(pwInput)}
                  placeholder="Password…"
                  autoFocus
                  className="w-full rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/40 outline-none backdrop-blur focus:border-white/40"
                />
                <button
                  onClick={() => verify(pwInput)}
                  className="w-full rounded-full bg-white/20 py-3 text-sm font-semibold text-white hover:bg-white/30 active:scale-[0.98] transition-all"
                >
                  Unlock
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 pb-6">
            <button onClick={() => { setPanel("idle"); setError("") }} className="text-white/60 text-xs hover:text-white/80">
              Cancel
            </button>
            <button onClick={() => { setPanel("recovery"); setError("") }} className="text-white/60 text-xs hover:text-white/80">
              Forgot? →
            </button>
          </div>
        </div>
      )}

      {/* ═══ FACE VERIFY PANEL ═══ */}
      {panel === "face-verify" && (
        <div className="relative flex h-full flex-col items-center justify-center px-6 gap-6 animate-in fade-in duration-300">
          <BigClock time={time} style={ls.clockStyle ?? "thin"} />
          <FaceVerify
            onSuccess={() => { setError(""); onUnlock() }}
            onFail={() => setPanel("unlock")}
            onCancel={() => setPanel("idle")}
          />
        </div>
      )}

      {/* ═══ RECOVERY ═══ */}
      {panel === "recovery" && (
        <div className="flex h-full flex-col items-center justify-center px-6 gap-5 animate-in fade-in duration-300">
          <button onClick={() => setPanel("unlock")} className="self-start flex items-center gap-1 text-white/60 text-sm hover:text-white/80">
            ← Back
          </button>
          <RefreshCw className="size-10 text-white/70" />
          <div className="text-center">
            <p className="text-lg font-semibold text-white">Account Recovery</p>
            <p className="mt-1 text-xs text-white/60">Verify your identity to reset your lock</p>
          </div>

          {/* Clerk account recovery — primary method */}
          {isSignedIn && clerkUser ? (
            <div className={cn("w-full rounded-2xl border border-white/20 px-4 py-4 space-y-3", blur, bg)}>
              <div className="flex items-center gap-3">
                <UserCheck className="size-5 text-green-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Signed in as</p>
                  <p className="text-xs text-white/60 truncate">
                    {clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.username ?? "your account"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { clearLockConfig(); onReset() }}
                className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 active:scale-[0.98] transition-all"
              >
                Reset lock with my account
              </button>
              <p className="text-[10px] text-white/40 text-center">
                Your Clerk account identity confirms it's you.
              </p>
            </div>
          ) : (
            <button
              onClick={() => { window.location.href = "/sign-in" }}
              className="flex w-full items-center gap-3 rounded-2xl bg-orange-500 px-4 py-3.5 hover:bg-orange-600 active:scale-[0.98] transition-all shadow-lg"
            >
              <UserCheck className="size-5 text-white shrink-0" />
              <span className="flex-1 text-left text-sm font-semibold text-white">Verify with my account</span>
            </button>
          )}

          <button
            onClick={() => { setPanel("recovery-email"); setError("") }}
            className={cn("flex w-full items-center gap-3 rounded-2xl border border-white/20 px-4 py-3.5 hover:bg-white/20 active:scale-[0.98] transition-all", blur, bg)}
          >
            <Mail className="size-5 text-white/80 shrink-0" />
            <span className="flex-1 text-left text-sm font-medium text-white">Use recovery email</span>
          </button>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        </div>
      )}

      {/* ═══ EMAIL RECOVERY ═══ */}
      {panel === "recovery-email" && (
        <div className="flex h-full flex-col items-center justify-center px-6 gap-5 animate-in fade-in duration-300">
          <button onClick={() => setPanel("recovery")} className="self-start text-white/60 text-sm hover:text-white/80">← Back</button>
          <Mail className="size-10 text-white/70" />
          <div className="text-center">
            <p className="text-lg font-semibold text-white">Email Recovery</p>
            <p className="mt-1 text-xs text-white/60">Enter the recovery email you set during lock setup.</p>
          </div>
          <input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleEmailRecovery()}
            placeholder="your@email.com"
            className="w-full rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-white/40 outline-none backdrop-blur focus:border-white/40"
          />
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            onClick={handleEmailRecovery}
            className="w-full rounded-2xl bg-white/20 py-3.5 text-sm font-semibold text-white hover:bg-white/30 active:scale-[0.98] transition-all"
          >
            Verify & Reset Lock
          </button>
        </div>
      )}
    </div>
  )
}
