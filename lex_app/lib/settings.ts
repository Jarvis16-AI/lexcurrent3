"use client"

export type Theme         = "light" | "dark" | "system"
export type FontSize      = "sm" | "md" | "lg"
export type Wallpaper     = "amber" | "ocean" | "forest" | "violet" | "rose" | "graphite"
export type AIPersonality = "friendly" | "professional" | "concise"
export type AIModelId    = "lex-flash" | "lex-think" | "lex-reason"

export interface AppSettings {
  theme:              Theme
  accentPreset:       string
  wallpaper:          Wallpaper
  fontSize:           FontSize
  voiceId:            string
  voiceName:          string
  voiceEnabled:       boolean
  autoSpeak:          boolean
  aiPersonality:      AIPersonality
  aiModel:            AIModelId
  notifSound:         boolean
  dnd:                boolean
  showBatteryPercent: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme:              "dark",
  accentPreset:       "amber",
  wallpaper:          "amber",
  fontSize:           "md",
  voiceId:            "en-US-AriaNeural",
  voiceName:          "Aria — Female, American",
  voiceEnabled:       true,
  autoSpeak:          true,
  aiPersonality:      "friendly",
  aiModel:            "lex-flash",
  notifSound:         true,
  dnd:                false,
  showBatteryPercent: false,
}

const KEY = "lex-settings-v1"

/* custom wallpaper from gallery (data URL or object URL) */
export const CUSTOM_WALLPAPER_KEY = "lex-custom-wallpaper-v1"

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch { return DEFAULT_SETTINGS }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

/* ── wallpaper gradients ─────────────────────────────────────── */
export const WALLPAPERS: Record<Wallpaper, { label: string; gradient: string; preview: [string, string] }> = {
  amber:    { label: "Sunset",   gradient: "radial-gradient(ellipse at top, rgba(124,45,18,0.45) 0%, #0c0a09 60%)",  preview: ["#7c2d12", "#0c0a09"] },
  ocean:    { label: "Ocean",    gradient: "radial-gradient(ellipse at top, rgba(23,37,84,0.55) 0%, #020617 60%)",   preview: ["#172554", "#020617"] },
  forest:   { label: "Forest",   gradient: "radial-gradient(ellipse at top, rgba(6,78,59,0.5) 0%, #0a0a0a 60%)",    preview: ["#064e3b", "#0a0a0a"] },
  violet:   { label: "Galaxy",   gradient: "radial-gradient(ellipse at top, rgba(46,16,101,0.5) 0%, #0c0a09 60%)",  preview: ["#2e1065", "#0c0a09"] },
  rose:     { label: "Rose",     gradient: "radial-gradient(ellipse at top, rgba(136,19,55,0.5) 0%, #0c0a09 60%)",  preview: ["#881337", "#0c0a09"] },
  graphite: { label: "Graphite", gradient: "radial-gradient(ellipse at top, rgba(55,65,81,0.45) 0%, #0a0a0a 60%)", preview: ["#374151", "#0a0a0a"] },
}

/* ── accent color presets ────────────────────────────────────── */
export const ACCENT_PRESETS: { key: string; label: string; oklch: string; hex: string }[] = [
  { key: "amber",   label: "Amber",   oklch: "oklch(0.7 0.15 45)",   hex: "#d97706" },
  { key: "blue",    label: "Sky",     oklch: "oklch(0.6 0.2 250)",   hex: "#2563eb" },
  { key: "green",   label: "Forest",  oklch: "oklch(0.65 0.17 142)", hex: "#16a34a" },
  { key: "violet",  label: "Galaxy",  oklch: "oklch(0.65 0.2 300)",  hex: "#7c3aed" },
  { key: "rose",    label: "Rose",    oklch: "oklch(0.65 0.2 10)",   hex: "#e11d48" },
  { key: "teal",    label: "Teal",    oklch: "oklch(0.65 0.15 190)", hex: "#0d9488" },
  { key: "gold",    label: "Gold",    oklch: "oklch(0.78 0.18 65)",  hex: "#ca8a04" },
  { key: "crimson", label: "Crimson", oklch: "oklch(0.55 0.25 20)",  hex: "#dc2626" },
]

/* ── apply settings to DOM ───────────────────────────────────── */
export function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return
  const root = document.documentElement
  if (theme === "dark") {
    root.classList.add("dark")
  } else if (theme === "light") {
    root.classList.remove("dark")
  } else {
    root.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches)
  }
}

export function applyAccent(preset: string) {
  if (typeof window === "undefined") return
  const p = ACCENT_PRESETS.find(a => a.key === preset) ?? ACCENT_PRESETS[0]
  document.documentElement.style.setProperty("--primary", p.oklch)
}

export function applyFontSize(size: FontSize) {
  if (typeof window === "undefined") return
  const map: Record<FontSize, string> = { sm: "14px", md: "16px", lg: "18px" }
  document.documentElement.style.setProperty("--app-font-size", map[size])
}

export function applyAllSettings(s: AppSettings) {
  applyTheme(s.theme)
  applyAccent(s.accentPreset)
  applyFontSize(s.fontSize)
}

/* ── Microsoft Edge TTS neural voices (no API key required) ─── */
export const FALLBACK_VOICES = [
  { id: "en-US-AriaNeural",    name: "Aria — Female, American"     },
  { id: "en-US-JennyNeural",   name: "Jenny — Female, Friendly"    },
  { id: "en-US-GuyNeural",     name: "Guy — Male, American"        },
  { id: "en-US-EricNeural",    name: "Eric — Male, Friendly"       },
  { id: "en-US-DavisNeural",   name: "Davis — Male, Casual"        },
  { id: "en-US-AndrewNeural",  name: "Andrew — Male, Warm"         },
  { id: "en-GB-SoniaNeural",   name: "Sonia — Female, British"     },
  { id: "en-GB-RyanNeural",    name: "Ryan — Male, British"        },
  { id: "en-AU-NatashaNeural", name: "Natasha — Female, Australian"},
  { id: "en-IN-NeerjaNeural",  name: "Neerja — Female, Indian"     },
]
