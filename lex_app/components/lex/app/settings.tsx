"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronLeft, Volume2, Sun,
  Palette, Image as ImageIcon, Type, Bot, Bell, Lock,
  Info, RefreshCcw, Check, Play, Loader2, ChevronDown,
  KeyRound, ShieldCheck, ShieldOff, Terminal, UserCircle,
} from "lucide-react"
import { LockScreenSettingsPanel } from "../lock/settings-panel"
import { ClerkUserPanel } from "../clerk-user-panel"
import type { AppShared } from "./types"
import type { AppSettings, Wallpaper, Theme, FontSize, AIPersonality, AIModelId } from "@/lib/settings"
import {
  WALLPAPERS, ACCENT_PRESETS, FALLBACK_VOICES,
  applyTheme, applyAccent, applyFontSize,
} from "@/lib/settings"
import { cn } from "@/lib/utils"
import { setPremium, clearPremium, isPremium, getPremiumTier, hasAtLeast, type PremiumTier } from "@/lib/quota"
import { LEX_MODELS } from "@/lib/models"
import { useToast } from "@/components/ui/toast"

/* Permissive format check: must start with LEX- and contain only letters, digits, dashes */
const BYPASS_CODE_RE = /^LEX-[A-Z0-9]+-[A-Z0-9]+$/

/* ── Compress a photo using canvas before storing in localStorage ── */
async function compressWallpaper(file: File): Promise<string> {
  const MAX_DIM = 1920
  return new Promise<string>((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio  = Math.min(MAX_DIM / img.naturalWidth, MAX_DIM / img.naturalHeight, 1)
      const canvas = document.createElement("canvas")
      canvas.width  = Math.round(img.naturalWidth  * ratio)
      canvas.height = Math.round(img.naturalHeight * ratio)
      const ctx = canvas.getContext("2d")
      if (!ctx) { reject(new Error("Canvas unavailable on this device.")); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      /* try JPEG compression, reducing quality until it fits in ~4 MB */
      let q = 0.82
      let result = canvas.toDataURL("image/jpeg", q)
      while (result.length > 4_000_000 && q > 0.2) {
        q = Math.max(0.2, q - 0.15)
        result = canvas.toDataURL("image/jpeg", q)
      }
      if (result.length > 4_500_000) {
        reject(new Error("Photo is too complex to store. Please use a smaller image."))
      } else {
        resolve(result)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read the image file.")) }
    img.src = url
  })
}

interface Voice { id: string; name: string; category?: string }

interface SettingsScreenProps extends AppShared {
  settings:        AppSettings
  onSettingsChange: (s: AppSettings) => void
  onChangeLock:    () => void
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-1 pb-2 pt-4">
      <span className="text-primary">{icon}</span>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
    </div>
  )
}

function SettingRow({ label, sub, right, onPress }: {
  label: string; sub?: string; right?: React.ReactNode; onPress?: () => void
}) {
  const cls = cn(
    "flex w-full items-center justify-between rounded-xl px-3 py-3 text-left",
    onPress ? "hover:bg-accent/50 active:bg-accent/70 transition-colors cursor-pointer" : "cursor-default",
  )
  const inner = (
    <>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      {right && <span className="ml-3 shrink-0">{right}</span>}
    </>
  )
  if (onPress) return <button onClick={onPress} className={cls}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors duration-200",
        on ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-6 rounded-full bg-white shadow-md transition-transform duration-200",
          on ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

function Pills<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]
  value:   T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
            o.value === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-accent/60 text-foreground hover:bg-accent",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsScreen({ goBack, navigate, settings, onSettingsChange, onChangeLock }: SettingsScreenProps) {
  const { success, error: toastError, warning } = useToast()
  const [voices,       setVoices]       = useState<Voice[]>(FALLBACK_VOICES)
  const [loadingVoice, setLoadingVoice] = useState(true)
  const [previewing,   setPreviewing]   = useState(false)
  const [voiceOpen,    setVoiceOpen]    = useState(false)

  /* bypass code state */
  const [bypassCode,    setBypassCode]    = useState("")
  const [bypassLoading, setBypassLoading] = useState(false)
  const [bypassResult,  setBypassResult]  = useState<{ ok: boolean; msg: string } | null>(null)
  const [activeTier,    setActiveTier]    = useState<PremiumTier | null>(null)

  useEffect(() => {
    setActiveTier(getPremiumTier())
  }, [])

  async function redeemBypassCode() {
    const code = bypassCode.trim().toUpperCase()
    if (!code) return

    /* Client-side format validation before hitting the API */
    if (!BYPASS_CODE_RE.test(code)) {
      warning(
        "Invalid code format",
        "Bypass codes look like LEX-DEV-XXXX. Check for typos."
      )
      setBypassResult({ ok: false, msg: "❌ Format invalid — codes look like LEX-DEV-XXXX." })
      return
    }

    setBypassLoading(true)
    setBypassResult(null)
    try {
      const res  = await fetch("/api/bypass", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.valid) {
        setPremium(data.tier as PremiumTier, 365)
        setActiveTier(data.tier as PremiumTier)
        setBypassCode("")
        const remaining = data.usesRemaining === null ? "unlimited" : `${data.usesRemaining} left`
        setBypassResult({ ok: true, msg: `✅ ${data.label} activated (${data.tier.toUpperCase()} · ${remaining} uses)` })
        success(`${data.tier.toUpperCase()} access activated!`, `${remaining} uses remaining`)
      } else {
        const msg = data.error ?? "Invalid code."
        setBypassResult({ ok: false, msg: `❌ ${msg}` })
        toastError("Code not accepted", msg)
      }
    } catch {
      setBypassResult({ ok: false, msg: "❌ Network error — check your connection." })
      toastError("Network error", "Couldn't reach the server. Try again.")
    } finally {
      setBypassLoading(false)
    }
  }

  function revokeBypass() {
    clearPremium()
    setActiveTier(null)
    setBypassResult({ ok: true, msg: "Access revoked. Free tier restored." })
    success("Access revoked", "Back to free tier.")
  }

  /* load voices from Edge TTS on mount */
  useEffect(() => {
    fetch("/api/voice")
      .then(r => r.json())
      .then(d => {
        if (d.configured && d.voices?.length > 0) {
          setVoices(d.voices.map((v: Voice) => ({
            id:       v.id,
            name:     v.name,
            category: v.category,
          })))
        }
      })
      .catch(() => {})
      .finally(() => setLoadingVoice(false))
  }, [])

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value }
    onSettingsChange(next)

    /* live-apply certain settings */
    if (key === "theme")       applyTheme(value as Theme)
    if (key === "accentPreset") applyAccent(value as string)
    if (key === "fontSize")    applyFontSize(value as FontSize)
  }, [settings, onSettingsChange])

  /* voice preview */
  const previewVoice = async (voiceId: string) => {
    if (previewing) return
    setPreviewing(true)
    try {
      const res = await fetch("/api/voice", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ text: "Hi! I'm LEX, your intelligent AI launcher. How can I help you today?", voiceId }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = new Audio(url)
      a.onended  = () => { URL.revokeObjectURL(url); setPreviewing(false) }
      a.onerror  = () => setPreviewing(false)
      a.play().catch(() => setPreviewing(false))
    } catch { setPreviewing(false) }
  }

  const selectedVoice = voices.find(v => v.id === settings.voiceId) ?? voices[0]

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── header ── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-border/40 shrink-0">
        <button
          onClick={goBack}
          className="flex size-9 items-center justify-center rounded-full bg-accent/50 text-muted-foreground hover:bg-accent active:scale-90 transition-all"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Settings</h1>
      </div>

      {/* ── scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">

        {/* ── ACCOUNT ── */}
        <SectionHeader icon={<UserCircle className="size-4" />} title="Account" />
        <ClerkUserPanel onSignIn={() => { window.location.href = "/sign-in" }} />

        {/* ── VOICE ── */}
        <SectionHeader icon={<Volume2 className="size-4" />} title="Voice" />
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <SettingRow
            label="Voice Enabled"
            sub={settings.voiceEnabled ? "LEX will speak replies aloud" : "Text only"}
            right={<Toggle on={settings.voiceEnabled} onToggle={() => update("voiceEnabled", !settings.voiceEnabled)} />}
          />
          <div className="border-t border-border/50" />
          <SettingRow
            label="Auto-Speak Replies"
            sub="Speak every AI response automatically"
            right={<Toggle on={settings.autoSpeak} onToggle={() => update("autoSpeak", !settings.autoSpeak)} />}
          />
          <div className="border-t border-border/50" />

          {/* voice selector */}
          <div className="px-3 py-3">
            <p className="text-sm font-medium text-foreground mb-2">LEX Voice</p>
            {loadingVoice ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" /> Loading voices…
              </div>
            ) : (
              <>
                <button
                  onClick={() => setVoiceOpen(o => !o)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm hover:bg-accent/40 transition-colors"
                >
                  <span className="font-medium text-foreground truncate">{selectedVoice?.name ?? "Choose voice"}</span>
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", voiceOpen && "rotate-180")} />
                </button>

                {voiceOpen && (
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
                    {voices.map(v => (
                      <button
                        key={v.id}
                        onClick={() => { update("voiceId", v.id); update("voiceName", v.name); setVoiceOpen(false) }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-accent/50 transition-colors"
                      >
                        <span className={cn("font-medium", v.id === settings.voiceId ? "text-primary" : "text-foreground")}>{v.name}</span>
                        {v.id === settings.voiceId && <Check className="size-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => previewVoice(settings.voiceId)}
                  disabled={previewing || !settings.voiceEnabled}
                  className="mt-2 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {previewing ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  {previewing ? "Playing…" : "Preview Voice"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── APPEARANCE ── */}
        <SectionHeader icon={<Sun className="size-4" />} title="Appearance" />
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-3 py-3">
            <p className="text-sm font-medium text-foreground mb-2">Theme</p>
            <Pills<Theme>
              options={[
                { value: "light",  label: "☀️  Light"  },
                { value: "dark",   label: "🌙  Dark"   },
                { value: "system", label: "📱  System" },
              ]}
              value={settings.theme}
              onChange={v => update("theme", v)}
            />
          </div>
          <div className="border-t border-border/50" />
          <div className="px-3 py-3">
            <p className="text-sm font-medium text-foreground mb-2.5">Accent Color</p>
            <div className="flex flex-wrap gap-2.5">
              {ACCENT_PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => update("accentPreset", p.key)}
                  title={p.label}
                  className={cn(
                    "relative size-9 rounded-full transition-transform active:scale-90",
                    settings.accentPreset === p.key && "ring-2 ring-offset-2 ring-foreground scale-110",
                  )}
                  style={{ background: p.hex }}
                >
                  {settings.accentPreset === p.key && (
                    <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── WALLPAPER ── */}
        <SectionHeader icon={<ImageIcon className="size-4" />} title="Wallpaper" />
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(WALLPAPERS) as [Wallpaper, typeof WALLPAPERS[Wallpaper]][]).map(([key, w]) => (
              <button
                key={key}
                onClick={() => {
                  update("wallpaper", key)
                  /* clear custom wallpaper when a preset is chosen */
                  try { localStorage.removeItem("lex-custom-wallpaper-v1") } catch {}
                  window.dispatchEvent(new CustomEvent("lex-wallpaper-change", { detail: { type: "preset" } }))
                }}
                className={cn(
                  "relative h-20 rounded-xl overflow-hidden transition-transform active:scale-95",
                  settings.wallpaper === key && "ring-2 ring-primary ring-offset-2",
                )}
                style={{ background: `linear-gradient(to bottom, ${w.preview[0]}, ${w.preview[1]})` }}
              >
                {settings.wallpaper === key && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex size-6 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                      <Check className="size-3.5 text-white" />
                    </div>
                  </div>
                )}
                <p className="absolute bottom-1.5 inset-x-0 text-center text-[10px] font-semibold text-white/80">{w.label}</p>
              </button>
            ))}
          </div>

          {/* Gallery picker */}
          <div className="border-t border-border/40 pt-2">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">Or choose from gallery</p>
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground hover:bg-accent/40 transition-colors active:scale-[0.98]">
              <ImageIcon className="size-4 shrink-0 text-primary" />
              <span>Pick a photo…</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  e.target.value = ""

                  /* HEIC not supported by canvas */
                  if (
                    file.name.toLowerCase().endsWith(".heic") ||
                    file.type === "image/heic" ||
                    file.type === "image/heif"
                  ) {
                    toastError("HEIC not supported", "Open the photo in your Photos app → Share → Save as JPG first.")
                    return
                  }
                  if (!file.type.startsWith("image/")) {
                    toastError("Not an image", "Please choose a JPG, PNG, or WebP photo.")
                    return
                  }

                  try {
                    const dataUrl = await compressWallpaper(file)
                    localStorage.setItem("lex-custom-wallpaper-v1", dataUrl)
                    window.dispatchEvent(new CustomEvent("lex-wallpaper-change", { detail: { type: "custom", dataUrl } }))
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "Photo could not be imported."
                    toastError("Import failed", msg)
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* ── FONT ── */}
        <SectionHeader icon={<Type className="size-4" />} title="Text Size" />
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <Pills<FontSize>
            options={[
              { value: "sm", label: "Small"  },
              { value: "md", label: "Normal" },
              { value: "lg", label: "Large"  },
            ]}
            value={settings.fontSize}
            onChange={v => update("fontSize", v)}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {settings.fontSize === "sm" ? "Compact — fits more on screen"
             : settings.fontSize === "lg" ? "Large — easier on the eyes"
             : "Normal — balanced readability"}
          </p>
        </div>

        {/* ── LEX AI ── */}
        <SectionHeader icon={<Bot className="size-4" />} title="LEX AI" />

        {/* Model picker */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-3 py-3 space-y-2">
            <p className="text-sm font-medium text-foreground">AI Model</p>
            <p className="text-xs text-muted-foreground -mt-1">Choose the intelligence level for your LEX assistant.</p>
            <div className="space-y-2 pt-1">
              {LEX_MODELS.map(model => {
                const canUse  = !model.requiredTier || hasAtLeast(model.requiredTier as PremiumTier)
                const active  = (settings.aiModel ?? "lex-flash") === model.id
                const tierBadge =
                  model.requiredTier === "ultra" ? { label: "ULTRA", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" }
                  : model.requiredTier === "plus"  ? { label: "PLUS",  cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" }
                  : model.requiredTier === "pro"   ? { label: "PRO",   cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" }
                  : { label: "FREE", cls: "bg-green-500/20 text-green-400 border-green-500/30" }

                return (
                  <button
                    key={model.id}
                    disabled={!canUse}
                    onClick={() => canUse && update("aiModel", model.id as AIModelId)}
                    className={cn(
                      "w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                      active   ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
                               : "border-border bg-background/40 hover:border-border/80",
                      !canUse  && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <span className="text-xl leading-none mt-0.5">{model.badge}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>
                          {model.name}
                        </span>
                        <span className={cn("text-[9px] font-bold border rounded px-1 py-px uppercase tracking-wide", tierBadge.cls)}>
                          {tierBadge.label}
                        </span>
                        {!canUse && <span className="text-[9px] text-muted-foreground ml-auto">🔒 Upgrade</span>}
                        {active  && canUse && <span className="text-[10px] text-primary ml-auto font-medium">● Active</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">{model.tagline}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">{model.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Personality */}
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-3 py-3">
            <p className="text-sm font-medium text-foreground mb-2">AI Personality</p>
            <Pills<AIPersonality>
              options={[
                { value: "friendly",     label: "😊 Friendly"     },
                { value: "professional", label: "💼 Professional" },
                { value: "concise",      label: "⚡ Concise"      },
              ]}
              value={settings.aiPersonality}
              onChange={v => update("aiPersonality", v)}
            />
          </div>
        </div>

        {/* ── STATUS BAR ── */}
        <SectionHeader icon={<Info className="size-4" />} title="Status Bar" />
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <SettingRow
            label="Show Battery Percentage"
            sub="Display numeric battery % next to the icon"
            right={<Toggle on={!!settings.showBatteryPercent} onToggle={() => update("showBatteryPercent", !settings.showBatteryPercent)} />}
          />
        </div>

        {/* ── NOTIFICATIONS ── */}
        <SectionHeader icon={<Bell className="size-4" />} title="Notifications" />
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <SettingRow
            label="Do Not Disturb"
            sub="Mute voice responses and suppress alerts"
            right={<Toggle on={settings.dnd} onToggle={() => update("dnd", !settings.dnd)} />}
          />
          <div className="border-t border-border/50" />
          <SettingRow
            label="Notification Sounds"
            sub="Play sounds for alerts and updates"
            right={<Toggle on={settings.notifSound} onToggle={() => update("notifSound", !settings.notifSound)} />}
          />
        </div>

        {/* ── LOCK SCREEN ── */}
        <SectionHeader icon={<Lock className="size-4" />} title="Lock Screen" />
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <SettingRow
            label="Change Lock Method"
            sub="Update PIN, Pattern, Password or Face ID"
            onPress={onChangeLock}
            right={<ChevronLeft className="size-4 rotate-180 text-muted-foreground" />}
          />
        </div>

        {/* ── LOCK SCREEN CUSTOMISATION ── */}
        <LockScreenSettingsPanel navigate={navigate} />

        {/* ── ABOUT ── */}
        <SectionHeader icon={<Info className="size-4" />} title="About" />
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <SettingRow label="LEX AI Launcher" sub="Version 1.0.0 · Built with ❤️ on Replit" />
          <div className="border-t border-border/50" />
          <SettingRow label="Powered by" sub="Groq · Edge TTS · Whisper · Next.js 16 · Tailwind CSS 4" />
          <div className="border-t border-border/50" />
          <SettingRow
            label="Reset All Settings"
            sub="Restore defaults (does not clear lock)"
            onPress={() => {
              if (confirm("Reset all settings to defaults?")) {
                import("@/lib/settings").then(m => onSettingsChange(m.DEFAULT_SETTINGS))
              }
            }}
            right={<RefreshCcw className="size-4 text-muted-foreground" />}
          />
        </div>

        {/* ── DEVELOPER ACCESS ── */}
        <SectionHeader icon={<Terminal className="size-4" />} title="Developer Access" />
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

          {/* Active bypass status */}
          {activeTier ? (
            <div className="px-3 py-3">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="size-4 text-green-500 shrink-0" />
                <p className="text-sm font-semibold text-green-500">
                  {activeTier.toUpperCase()} bypass active
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">
                Subscription checks are bypassed. Quota limits are disabled.
              </p>
              <button
                onClick={revokeBypass}
                className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
              >
                <ShieldOff className="size-3.5" />
                Revoke bypass
              </button>
            </div>
          ) : (
            <div className="px-3 py-3">
              <p className="text-sm font-medium text-foreground mb-1">Enter Access Code</p>
              <p className="text-[11px] text-muted-foreground mb-3">
                Developer and beta bypass codes skip subscription checks for up to 1 year.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bypassCode}
                  onChange={e => {
                    setBypassCode(e.target.value)
                    setBypassResult(null)
                  }}
                  onKeyDown={e => e.key === "Enter" && redeemBypassCode()}
                  placeholder="LEX-DEV-XXXX"
                  spellCheck={false}
                  className={cn(
                    "flex-1 rounded-xl border bg-background px-3 py-2 text-sm font-mono",
                    "placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                    "border-border uppercase tracking-widest",
                  )}
                />
                <button
                  onClick={redeemBypassCode}
                  disabled={bypassLoading || !bypassCode.trim()}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold",
                    "bg-primary text-primary-foreground transition-opacity",
                    "disabled:opacity-40",
                  )}
                >
                  {bypassLoading
                    ? <Loader2 className="size-4 animate-spin" />
                    : <KeyRound className="size-4" />}
                  {bypassLoading ? "…" : "Redeem"}
                </button>
              </div>
            </div>
          )}

          {/* Result message */}
          {bypassResult && (
            <>
              <div className="border-t border-border/50" />
              <div className={cn(
                "px-3 py-2 text-[11px] font-medium",
                bypassResult.ok ? "text-green-500" : "text-red-400",
              )}>
                {bypassResult.msg}
              </div>
            </>
          )}
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
