"use client"

export type LockWallpaper   = "default" | "cosmos" | "aurora" | "ocean" | "sunset" | "forest" | "neon" | "mono" | "custom"
export type BlurStrength    = "none" | "light" | "medium" | "heavy"
export type UnlockAnimation = "slide" | "fade" | "scale" | "spring"
export type LockClockStyle  = "thin" | "bold" | "mono" | "serif"

export interface LockGoal     { id: string; title: string; progress: number }
export interface LockReminder { id: string; text: string; time: string }

export interface LockScreenSettings {
  wallpaper:       LockWallpaper
  blurStrength:    BlurStrength
  unlockAnimation: UnlockAnimation
  clockStyle:      LockClockStyle
  quickApps:       boolean
  notifPreview:    boolean
  /* Pro+ */
  aiWidgets:       boolean
  contextCards:    boolean
  /* Plus+ */
  smartReminders:  boolean
  dailyBriefing:   boolean
  /* Ultra */
  goalTracking:    boolean
}

/* ── lock-screen notifications ──────────────────────────────── */
export interface LockNotification {
  id:      string
  app:     string
  icon:    string   // emoji
  title:   string
  body:    string
  time:    number   // Date.now()
}

export const DEFAULT_LOCK_SETTINGS: LockScreenSettings = {
  wallpaper:       "default",
  blurStrength:    "medium",
  unlockAnimation: "slide",
  clockStyle:      "thin",
  quickApps:       true,
  notifPreview:    true,
  aiWidgets:       false,
  contextCards:    false,
  smartReminders:  false,
  dailyBriefing:   false,
  goalTracking:    false,
}

const CUSTOM_WP_KEY = "lex-custom-lock-wallpaper-v1"

export function loadCustomLockWallpaper(): string | null {
  if (typeof window === "undefined") return null
  try { return localStorage.getItem(CUSTOM_WP_KEY) } catch { return null }
}

export function saveCustomLockWallpaper(dataUrl: string) {
  if (typeof window === "undefined") return
  try { localStorage.setItem(CUSTOM_WP_KEY, dataUrl) } catch {}
}

export function clearCustomLockWallpaper() {
  if (typeof window === "undefined") return
  try { localStorage.removeItem(CUSTOM_WP_KEY) } catch {}
}

const LS_KEY    = "lex-lockscreen-settings-v1"
const GOALS_KEY = "lex-goals-v1"
const REM_KEY   = "lex-reminders-v1"
const NOTIF_KEY = "lex-lock-notifications-v1"

const MAX_NOTIFS = 5

export function loadNotifications(): LockNotification[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(NOTIF_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function pushNotification(n: Omit<LockNotification, "id" | "time">) {
  if (typeof window === "undefined") return
  const notif: LockNotification = { ...n, id: Date.now().toString(), time: Date.now() }
  const existing = loadNotifications()
  const updated  = [notif, ...existing].slice(0, MAX_NOTIFS)
  localStorage.setItem(NOTIF_KEY, JSON.stringify(updated))
}

export function clearNotifications() {
  if (typeof window === "undefined") return
  localStorage.removeItem(NOTIF_KEY)
}

export function loadLockSettings(): LockScreenSettings {
  if (typeof window === "undefined") return DEFAULT_LOCK_SETTINGS
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return DEFAULT_LOCK_SETTINGS
    return { ...DEFAULT_LOCK_SETTINGS, ...JSON.parse(raw) }
  } catch { return DEFAULT_LOCK_SETTINGS }
}

export function saveLockSettings(s: LockScreenSettings) {
  if (typeof window === "undefined") return
  localStorage.setItem(LS_KEY, JSON.stringify(s))
}

export function loadGoals(): LockGoal[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(GOALS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveGoals(goals: LockGoal[]) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals))
}

export function loadReminders(): LockReminder[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(REM_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveReminders(rem: LockReminder[]) {
  localStorage.setItem(REM_KEY, JSON.stringify(rem))
}

/* ── wallpaper definitions ────────────────────────────────────── */
export const LOCK_WALLPAPERS: Record<LockWallpaper, {
  label:    string
  gradient: string
  glow:     string
  preview:  [string, string]
}> = {
  default: {
    label:    "Default",
    gradient: "linear-gradient(to bottom, #1c1917, #292524, #0c0a09)",
    glow:     "rgba(251,146,60,0.12)",
    preview:  ["#292524", "#0c0a09"],
  },
  cosmos: {
    label:    "Cosmos",
    gradient: "linear-gradient(135deg, #0a0520 0%, #1a0a45 50%, #0a0520 100%)",
    glow:     "rgba(168,85,247,0.20)",
    preview:  ["#0a0520", "#1a0a45"],
  },
  aurora: {
    label:    "Aurora",
    gradient: "linear-gradient(to bottom, #001a12, #003528, #001a12)",
    glow:     "rgba(34,197,94,0.18)",
    preview:  ["#001a12", "#003528"],
  },
  ocean: {
    label:    "Ocean",
    gradient: "linear-gradient(to bottom, #000b1a, #001535, #000b1a)",
    glow:     "rgba(59,130,246,0.18)",
    preview:  ["#000b1a", "#001535"],
  },
  sunset: {
    label:    "Sunset",
    gradient: "linear-gradient(to bottom, #1a0520, #3d0c15, #120310)",
    glow:     "rgba(239,68,68,0.18)",
    preview:  ["#1a0520", "#3d0c15"],
  },
  forest: {
    label:    "Forest",
    gradient: "linear-gradient(to bottom, #010f08, #021d0e, #010f08)",
    glow:     "rgba(16,185,129,0.15)",
    preview:  ["#010f08", "#021d0e"],
  },
  neon: {
    label:    "Neon",
    gradient: "linear-gradient(135deg, #050010 0%, #0f0025 40%, #001520 100%)",
    glow:     "rgba(6,182,212,0.22)",
    preview:  ["#050010", "#001520"],
  },
  mono: {
    label:    "Mono",
    gradient: "linear-gradient(to bottom, #000000, #111111, #000000)",
    glow:     "rgba(255,255,255,0.06)",
    preview:  ["#000000", "#111111"],
  },
  custom: {
    label:    "My Photo",
    gradient: "linear-gradient(to bottom, #0a0a0a, #1a1a1a)",
    glow:     "rgba(255,255,255,0.08)",
    preview:  ["#1a1a1a", "#0a0a0a"],
  },
}

/* ── blur helpers ─────────────────────────────────────────────── */
export const BLUR_CLASSES: Record<BlurStrength, string> = {
  none:   "",
  light:  "backdrop-blur-sm",
  medium: "backdrop-blur-md",
  heavy:  "backdrop-blur-xl",
}

export const BLUR_BG: Record<BlurStrength, string> = {
  none:   "bg-white/12",
  light:  "bg-white/10",
  medium: "bg-white/8",
  heavy:  "bg-white/5",
}

/* ── animation classes ────────────────────────────────────────── */
export const ANIM_CLASSES: Record<UnlockAnimation, string> = {
  slide:  "animate-in slide-in-from-bottom-8 duration-500 ease-out",
  fade:   "animate-in fade-in duration-400 ease-in-out",
  scale:  "animate-in zoom-in-95 fade-in-80 duration-400 ease-out",
  spring: "animate-in slide-in-from-bottom-6 duration-700 ease-out",
}
