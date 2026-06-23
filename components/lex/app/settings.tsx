"use client"

import { useState, useEffect, useCallback, memo } from "react"
import {
  ChevronLeft, ChevronRight, Volume2, Sun, Palette, Image as ImageIcon,
  Type, Bot, Bell, Lock, Info, Check, Play, Loader2, ChevronDown,
  KeyRound, Sparkles, UserCircle, Crown, Shield, Brain, Smartphone,
  Settings as SettingsIcon, Zap, Code2, RefreshCcw,
} from "lucide-react"
import { haptic } from "@/lib/haptics"
import { LockScreenSettingsPanel } from "../lock/settings-panel"
import { ClerkUserPanel } from "../clerk-user-panel"
import type { AppShared } from "./types"
import type {
  AppSettings, Wallpaper, Theme, FontSize, FontFamily,
  AIPersonality, AIModelId, OrbSpeed, ColorTheme,
} from "@/lib/settings"
import {
  WALLPAPERS, ACCENT_PRESETS, FALLBACK_VOICES, FONT_FAMILIES, COLOR_THEMES,
  applyTheme, applyAccent, applyFontSize, applyFontFamily, applyOrbSpeed,
} from "@/lib/settings"
import { cn } from "@/lib/utils"
import {
  setPremium, clearPremium, isPremium, getPremiumTier,
  hasAtLeast, type PremiumTier,
} from "@/lib/quota"
import { LEX_MODELS } from "@/lib/models"
import { useToast } from "@/components/ui/toast"

const BYPASS_CODE_RE = /^LEX-[A-Z0-9]+-[A-Z0-9]+$/

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
      if (!ctx) { reject(new Error("Canvas unavailable.")); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      let q = 0.82
      let result = canvas.toDataURL("image/jpeg", q)
      while (result.length > 4_000_000 && q > 0.2) {
        q = Math.max(0.2, q - 0.15)
        result = canvas.toDataURL("image/jpeg", q)
      }
      if (result.length > 4_500_000) reject(new Error("Photo is too complex. Use a smaller image."))
      else resolve(result)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image.")) }
    img.src = url
  })
}

interface Voice { id: string; name: string; category?: string }

type SettingsPage =
  | null
  | "general" | "appearance" | "ai" | "voice"
  | "launcher" | "lockscreen" | "memory"
  | "notifications" | "privacy" | "premium" | "developer"

interface SettingsScreenProps extends AppShared {
  settings:         AppSettings
  onSettingsChange: (s: AppSettings) => void
  onChangeLock:     () => void
}

/* ── Shared sub-components ─────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 pt-5 pb-1.5">
      {children}
    </p>
  )
}

function SettingRow({ label, sub, right, onPress, danger }: {
  label: string; sub?: string; right?: React.ReactNode; onPress?: () => void; danger?: boolean
}) {
  const cls = cn(
    "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left",
    onPress ? "hover:bg-accent/50 active:bg-accent/70 transition-colors cursor-pointer" : "cursor-default",
    danger && "text-destructive",
  )
  const inner = (
    <>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", danger ? "text-destructive" : "text-foreground")}>{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{sub}</p>}
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
        "relative h-7 w-12 rounded-full transition-colors duration-200 shrink-0",
        on ? "bg-primary" : "bg-muted",
      )}
    >
      <span className={cn(
        "absolute top-0.5 size-6 rounded-full bg-white shadow-md transition-transform duration-200",
        on ? "translate-x-5" : "translate-x-0.5",
      )} />
    </button>
  )
}

function Pills<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]
  value: T; onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95",
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden divide-y divide-border/40">
      {children}
    </div>
  )
}

function SubPageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-border/40">
      <button
        onClick={onBack}
        className="flex size-9 items-center justify-center rounded-full bg-accent/50 text-muted-foreground hover:bg-accent active:scale-90 transition-all"
      >
        <ChevronLeft className="size-5" />
      </button>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
    </div>
  )
}

/* ── Category grid card ── */
function CategoryCard({
  icon, label, onPress, badge,
}: {
  icon: React.ReactNode; label: string; onPress: () => void; badge?: string
}) {
  return (
    <button
      onClick={onPress}
      className="relative flex flex-col items-center gap-2.5 rounded-2xl border border-border/60 bg-card p-4 text-center transition-all active:scale-95 hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <span className="text-xs font-semibold text-foreground leading-tight">{label}</span>
      {badge && (
        <span className="absolute top-2 right-2 rounded-full bg-primary px-1.5 py-px text-[8px] font-bold text-primary-foreground uppercase tracking-wide">
          {badge}
        </span>
      )}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════
   MAIN SETTINGS SCREEN
   ═══════════════════════════════════════════════════════ */
export function SettingsScreen({
  goBack, navigate, settings, onSettingsChange, onChangeLock,
}: SettingsScreenProps) {
  const [page, setPage]               = useState<SettingsPage>(null)
  const { success, error: toastError, warning } = useToast()

  const [voices,       setVoices]       = useState<Voice[]>(FALLBACK_VOICES)
  const [loadingVoice, setLoadingVoice] = useState(true)
  const [previewing,   setPreviewing]   = useState(false)
  const [voiceOpen,    setVoiceOpen]    = useState(false)

  const [bypassCode,    setBypassCode]    = useState("")
  const [bypassLoading, setBypassLoading] = useState(false)
  const [bypassResult,  setBypassResult]  = useState<{ ok: boolean; msg: string } | null>(null)
  const [activeTier,    setActiveTier]    = useState<PremiumTier | null>(null)

  useEffect(() => { setActiveTier(getPremiumTier()) }, [])

  useEffect(() => {
    fetch("/api/voice")
      .then(r => r.json())
      .then(d => {
        if (d.configured && d.voices?.length > 0) setVoices(d.voices)
      })
      .catch(() => {})
      .finally(() => setLoadingVoice(false))
  }, [])

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const next = { ...settings, [key]: value }
    onSettingsChange(next)
    if (key === "theme")       applyTheme(value as Theme)
    if (key === "accentPreset") applyAccent(value as string)
    if (key === "fontSize")    applyFontSize(value as FontSize)
    if (key === "fontFamily")  applyFontFamily(value as FontFamily)
    if (key === "orbSpeed")    applyOrbSpeed(value as OrbSpeed)
  }, [settings, onSettingsChange])

  const previewVoice = async (voiceId: string) => {
    if (previewing) return
    setPreviewing(true)
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hey — I'm LEX. Your intelligent AI launcher.", voiceId }),
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

  async function redeemCode() {
    const code = bypassCode.trim().toUpperCase()
    if (!code) return
    if (!BYPASS_CODE_RE.test(code)) {
      warning("Invalid format", "Codes look like LEX-PRO-XXXX. Check for typos.")
      setBypassResult({ ok: false, msg: "❌ Invalid format — must be LEX-TIER-XXXX" })
      return
    }
    setBypassLoading(true); setBypassResult(null)
    try {
      const res  = await fetch("/api/bypass", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (data.valid) {
        setPremium(data.tier as PremiumTier, 365)
        setActiveTier(data.tier as PremiumTier)
        setBypassCode("")
        const rem = data.usesRemaining === null ? "unlimited" : `${data.usesRemaining} left`
        setBypassResult({ ok: true, msg: `✅ ${data.tier.toUpperCase()} activated (${rem} uses)` })
        success(`${data.tier.toUpperCase()} access activated!`, `Welcome to LEX ${data.tier.toUpperCase()}`)
      } else {
        const msg = data.error ?? "Invalid code."
        setBypassResult({ ok: false, msg: `❌ ${msg}` })
        toastError("Code not accepted", msg)
      }
    } catch {
      setBypassResult({ ok: false, msg: "❌ Network error — check your connection." })
      toastError("Network error", "Couldn't reach the server.")
    } finally { setBypassLoading(false) }
  }

  const openPage = (p: SettingsPage) => { haptic("navigate"); setPage(p) }
  const closePage = () => { haptic("navigate"); setPage(null) }

  const selectedVoice = voices.find(v => v.id === settings.voiceId) ?? voices[0]

  /* ── CATEGORY GRID (main view) ── */
  if (page === null) return (
    <div className="flex h-full flex-col overflow-hidden lex-screen-enter">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0 border-b border-border/40">
        <button
          onClick={goBack}
          className="flex size-9 items-center justify-center rounded-full bg-accent/50 text-muted-foreground hover:bg-accent active:scale-90 transition-all"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Settings</h1>
          <p className="text-[11px] text-muted-foreground">LEX OS</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8 pt-4">
        {/* Account strip */}
        <div className="mb-5">
          <ClerkUserPanel onSignIn={() => { window.location.href = "/sign-in" }} />
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-3 gap-3">
          <CategoryCard icon={<SettingsIcon className="size-5" />}  label="General"     onPress={() => openPage("general")} />
          <CategoryCard icon={<Sun className="size-5" />}           label="Appearance"  onPress={() => openPage("appearance")} />
          <CategoryCard icon={<Bot className="size-5" />}           label="AI"          onPress={() => openPage("ai")} />
          <CategoryCard icon={<Volume2 className="size-5" />}       label="Voice"       onPress={() => openPage("voice")} />
          <CategoryCard icon={<Smartphone className="size-5" />}    label="Launcher"    onPress={() => openPage("launcher")} />
          <CategoryCard icon={<Lock className="size-5" />}          label="Lock Screen" onPress={() => openPage("lockscreen")} />
          <CategoryCard icon={<Brain className="size-5" />}         label="Memory"      onPress={() => openPage("memory")} />
          <CategoryCard icon={<Bell className="size-5" />}          label="Notifications" onPress={() => openPage("notifications")} />
          <CategoryCard icon={<Shield className="size-5" />}        label="Privacy"     onPress={() => openPage("privacy")} />
          <CategoryCard
            icon={<Crown className="size-5" />}
            label="Premium"
            onPress={() => openPage("premium")}
            badge={activeTier && activeTier !== "free" ? activeTier.toUpperCase() : undefined}
          />
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-8 font-medium tracking-wide">LEX OS · Built for humans</p>
      </div>
    </div>
  )

  /* ── SUB-PAGES ── */
  const pageProps = { onBack: closePage, settings, update, navigate, onChangeLock }

  return (
    <div className="flex h-full flex-col overflow-hidden lex-screen-enter">
      {page === "general"       && <GeneralPage       {...pageProps} />}
      {page === "appearance"    && <AppearancePage    {...pageProps} />}
      {page === "ai"            && <AIPage            {...pageProps} />}
      {page === "voice"         && (
        <VoicePage
          {...pageProps}
          voices={voices}
          loadingVoice={loadingVoice}
          previewing={previewing}
          voiceOpen={voiceOpen}
          setVoiceOpen={setVoiceOpen}
          previewVoice={previewVoice}
          selectedVoice={selectedVoice}
        />
      )}
      {page === "launcher"      && <LauncherPage      {...pageProps} />}
      {page === "lockscreen"    && <LockScreenPage    {...pageProps} />}
      {page === "memory"        && <MemoryPage        {...pageProps} />}
      {page === "notifications" && <NotificationsPage {...pageProps} />}
      {page === "privacy"       && <PrivacyPage       {...pageProps} />}
      {page === "premium"       && (
        <PremiumPage
          {...pageProps}
          activeTier={activeTier}
          setActiveTier={setActiveTier}
          bypassCode={bypassCode}
          setBypassCode={setBypassCode}
          bypassLoading={bypassLoading}
          bypassResult={bypassResult}
          onRedeem={redeemCode}
          onRevoke={() => {
            clearPremium(); setActiveTier(null)
            setBypassResult({ ok: true, msg: "Access revoked. Free tier restored." })
          }}
        />
      )}
      {page === "developer"     && <DeveloperPage     {...pageProps} />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   SUB-PAGES
   ═══════════════════════════════════════════════════════ */

interface PageProps {
  onBack:           () => void
  settings:         AppSettings
  update:           <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  navigate:         (screen: string) => void
  onChangeLock:     () => void
}

/* ── GENERAL ── */
function GeneralPage({ onBack, settings, update }: PageProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="General" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <SectionLabel>Status Bar</SectionLabel>
        <Card>
          <SettingRow
            label="Battery Percentage"
            sub="Show numeric % next to the battery icon"
            right={<Toggle on={!!settings.showBatteryPercent} onToggle={() => update("showBatteryPercent", !settings.showBatteryPercent)} />}
          />
        </Card>
        <SectionLabel>About</SectionLabel>
        <Card>
          <SettingRow label="LEX OS" sub="Intelligent AI launcher" right={<span className="text-xs text-muted-foreground font-mono">v1.0</span>} />
          <SettingRow label="AI Engine" sub="Powered by Groq" right={<span className="text-xs text-muted-foreground">⚡ Fast</span>} />
          <SettingRow label="Voice Engine" sub="Microsoft Edge TTS" right={<span className="text-xs text-muted-foreground">Free</span>} />
        </Card>
      </div>
    </div>
  )
}

/* ── APPEARANCE ── */
function AppearancePage({ onBack, settings, update }: PageProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="Appearance" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">

        <SectionLabel>Theme Mode</SectionLabel>
        <Card>
          <div className="p-3">
            <Pills<Theme>
              options={[
                { value: "light",  label: "☀️  Light"  },
                { value: "dark",   label: "🌙  Dark"   },
                { value: "system", label: "📱  Auto"   },
              ]}
              value={settings.theme}
              onChange={v => update("theme", v)}
            />
          </div>
        </Card>

        <SectionLabel>Color Theme</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_THEMES.map(t => (
            <button
              key={t.key}
              onClick={() => update("colorTheme" as keyof AppSettings, t.key as AppSettings[keyof AppSettings])}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-95",
                settings.colorTheme === t.key
                  ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
                  : "border-border/60 bg-card hover:border-border",
              )}
            >
              <span className="text-xl">{t.emoji}</span>
              <div className="min-w-0">
                <p className={cn("text-xs font-semibold", settings.colorTheme === t.key ? "text-primary" : "text-foreground")}>{t.label}</p>
                <p className="text-[10px] text-muted-foreground">{t.description}</p>
              </div>
            </button>
          ))}
        </div>

        <SectionLabel>Accent Color</SectionLabel>
        <Card>
          <div className="p-3">
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
        </Card>

        <SectionLabel>Wallpaper</SectionLabel>
        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(WALLPAPERS) as [Wallpaper, typeof WALLPAPERS[Wallpaper]][]).map(([key, w]) => (
              <button
                key={key}
                onClick={() => {
                  update("wallpaper", key)
                  try { localStorage.removeItem("lex-custom-wallpaper-v1") } catch {}
                  window.dispatchEvent(new CustomEvent("lex-wallpaper-change", { detail: { type: "preset" } }))
                }}
                className={cn(
                  "relative h-16 rounded-xl overflow-hidden transition-transform active:scale-95",
                  settings.wallpaper === key && "ring-2 ring-primary ring-offset-1",
                )}
                style={{ background: `linear-gradient(to bottom, ${w.preview[0]}, ${w.preview[1]})` }}
              >
                {settings.wallpaper === key && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="size-4 text-white drop-shadow" />
                  </div>
                )}
                <p className="absolute bottom-1 inset-x-0 text-center text-[9px] font-semibold text-white/80">{w.label}</p>
              </button>
            ))}
          </div>
          <div className="border-t border-border/40 pt-2">
            <label className="flex w-full cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-background/60 px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent/40 transition-colors active:scale-[0.98]">
              <ImageIcon className="size-4 shrink-0 text-primary" />
              <span className="text-xs">Pick from gallery…</span>
              <input type="file" accept="image/*" className="hidden" onChange={async e => {
                const file = e.target.files?.[0]; if (!file) return; e.target.value = ""
                if (!file.type.startsWith("image/")) return
                try {
                  const dataUrl = await compressWallpaper(file)
                  localStorage.setItem("lex-custom-wallpaper-v1", dataUrl)
                  window.dispatchEvent(new CustomEvent("lex-wallpaper-change", { detail: { type: "custom", dataUrl } }))
                } catch {}
              }} />
            </label>
          </div>
        </div>

        <SectionLabel>Typography</SectionLabel>
        <Card>
          <div className="p-3 space-y-3">
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Font Family</p>
              <div className="grid grid-cols-2 gap-2">
                {FONT_FAMILIES.map(f => (
                  <button
                    key={f.key}
                    onClick={() => update("fontFamily" as keyof AppSettings, f.key as AppSettings[keyof AppSettings])}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-all active:scale-95",
                      settings.fontFamily === f.key
                        ? "border-primary/60 bg-primary/10"
                        : "border-border/60 bg-background/40 hover:border-border",
                    )}
                  >
                    <span className="text-lg font-bold" style={{ fontFamily: f.stack }}>{f.sample}</span>
                    <span className={cn("text-xs font-medium", settings.fontFamily === f.key ? "text-primary" : "text-foreground")}>{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border/40 pt-2">
              <p className="text-xs font-semibold text-foreground mb-2">Text Size</p>
              <Pills<FontSize>
                options={[
                  { value: "sm", label: "Small"  },
                  { value: "md", label: "Normal" },
                  { value: "lg", label: "Large"  },
                ]}
                value={settings.fontSize}
                onChange={v => update("fontSize", v)}
              />
            </div>
          </div>
        </Card>

        <SectionLabel>Orb Animation</SectionLabel>
        <Card>
          <div className="p-3">
            <Pills<OrbSpeed>
              options={[
                { value: "calm",    label: "🌊 Calm"    },
                { value: "normal",  label: "✨ Normal"  },
                { value: "dynamic", label: "⚡ Dynamic" },
              ]}
              value={settings.orbSpeed ?? "normal"}
              onChange={v => update("orbSpeed", v)}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {settings.orbSpeed === "calm" ? "Slow, meditative morphing"
                : settings.orbSpeed === "dynamic" ? "Fast, energetic — full LEX mode"
                : "Balanced animation speed"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ── AI ── */
function AIPage({ onBack, settings, update }: PageProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="AI" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <SectionLabel>Intelligence Level</SectionLabel>
        <div className="space-y-2">
          {LEX_MODELS.map(model => {
            const canUse = !model.requiredTier || hasAtLeast(model.requiredTier as PremiumTier)
            const active = (settings.aiModel ?? "lex-flash") === model.id
            const tierBadge =
              model.requiredTier === "ultra" ? { label: "ULTRA", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" }
              : model.requiredTier === "plus" ? { label: "PLUS",  cls: "bg-purple-500/20 text-purple-400 border-purple-500/30" }
              : model.requiredTier === "pro"  ? { label: "PRO",   cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" }
              : { label: "FREE", cls: "bg-green-500/20 text-green-400 border-green-500/30" }
            return (
              <button
                key={model.id}
                disabled={!canUse}
                onClick={() => canUse && update("aiModel", model.id as AIModelId)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98]",
                  active ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30"
                         : "border-border/60 bg-card hover:border-border",
                  !canUse && "opacity-50 cursor-not-allowed",
                )}
              >
                <span className="text-2xl leading-none mt-0.5">{model.badge}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-sm font-bold", active ? "text-primary" : "text-foreground")}>{model.name}</span>
                    <span className={cn("text-[9px] font-bold border rounded px-1 py-px uppercase tracking-wide", tierBadge.cls)}>{tierBadge.label}</span>
                    {!canUse && <span className="text-[9px] text-muted-foreground ml-auto">🔒 Upgrade</span>}
                    {active && canUse && <span className="text-[10px] text-primary ml-auto font-semibold">● Active</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{model.tagline}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">{model.description}</p>
                </div>
              </button>
            )
          })}
        </div>

        <SectionLabel>Personality</SectionLabel>
        <Card>
          <div className="p-3">
            <Pills<AIPersonality>
              options={[
                { value: "friendly",     label: "😊 Friendly"     },
                { value: "professional", label: "💼 Professional" },
                { value: "concise",      label: "⚡ Concise"      },
              ]}
              value={settings.aiPersonality}
              onChange={v => update("aiPersonality", v)}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {settings.aiPersonality === "professional" ? "Precise, structured, lead with the answer"
                : settings.aiPersonality === "concise" ? "Ultra-brief — 1-3 sentences max"
                : "Warm and direct — like a smart friend"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ── VOICE ── */
function VoicePage({ onBack, settings, update, voices, loadingVoice, previewing, voiceOpen, setVoiceOpen, previewVoice, selectedVoice }: PageProps & {
  voices: Voice[]; loadingVoice: boolean; previewing: boolean
  voiceOpen: boolean; setVoiceOpen: (v: boolean) => void
  previewVoice: (id: string) => void; selectedVoice: Voice | undefined
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="Voice" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <SectionLabel>Voice Output</SectionLabel>
        <Card>
          <SettingRow
            label="Voice Enabled"
            sub={settings.voiceEnabled ? "LEX will speak replies aloud" : "Text-only mode"}
            right={<Toggle on={settings.voiceEnabled} onToggle={() => update("voiceEnabled", !settings.voiceEnabled)} />}
          />
          <SettingRow
            label="Auto-Speak Replies"
            sub="Speak every AI response automatically"
            right={<Toggle on={settings.autoSpeak} onToggle={() => update("autoSpeak", !settings.autoSpeak)} />}
          />
        </Card>

        <SectionLabel>LEX Voice</SectionLabel>
        <Card>
          <div className="p-3 space-y-2">
            {loadingVoice ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                <Loader2 className="size-4 animate-spin" /> Loading voices…
              </div>
            ) : (
              <>
                <button
                  onClick={() => setVoiceOpen(!voiceOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm hover:bg-accent/40 transition-colors"
                >
                  <span className="font-medium text-foreground truncate">{selectedVoice?.name ?? "Choose voice"}</span>
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", voiceOpen && "rotate-180")} />
                </button>
                {voiceOpen && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-background shadow-lg">
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
                  className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {previewing ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  {previewing ? "Playing…" : "Preview Voice"}
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ── LAUNCHER ── */
function LauncherPage({ onBack }: PageProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="Launcher" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <SectionLabel>Layout</SectionLabel>
        <Card>
          <SettingRow label="App Grid" sub="Customise columns and icon size" right={<ChevronRight className="size-4 text-muted-foreground" />} />
          <SettingRow label="Dock" sub="Pinned apps in the bottom dock" right={<ChevronRight className="size-4 text-muted-foreground" />} />
        </Card>
        <div className="mt-6 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">More launcher settings coming soon</p>
        </div>
      </div>
    </div>
  )
}

/* ── LOCK SCREEN ── */
function LockScreenPage({ onBack, navigate, onChangeLock }: PageProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="Lock Screen" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <SectionLabel>Security</SectionLabel>
        <Card>
          <SettingRow
            label="Change Lock Method"
            sub="Update PIN, Pattern, or Password"
            onPress={onChangeLock}
            right={<ChevronRight className="size-4 text-muted-foreground" />}
          />
        </Card>
        <LockScreenSettingsPanel navigate={navigate} />
      </div>
    </div>
  )
}

/* ── MEMORY ── */
function MemoryPage({ onBack }: PageProps) {
  const [count, setCount] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)
  const { success, error: toastError } = useToast()

  useEffect(() => {
    fetch("/api/memory").then(r => r.json()).then(d => setCount(d.memories?.length ?? 0)).catch(() => {})
  }, [])

  async function clearMemory() {
    setClearing(true)
    try {
      await fetch("/api/memory", { method: "DELETE" })
      setCount(0)
      success("Memory cleared", "LEX will start fresh.")
    } catch { toastError("Error", "Could not clear memory.") }
    finally { setClearing(false) }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="Memory" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <SectionLabel>Status</SectionLabel>
        <Card>
          <SettingRow
            label="Stored Memories"
            sub="Things LEX has learned about you"
            right={<span className="text-sm font-bold text-primary">{count ?? "—"}</span>}
          />
        </Card>
        <SectionLabel>Actions</SectionLabel>
        <Card>
          <SettingRow
            label="Clear All Memories"
            sub="LEX will forget everything about you"
            onPress={clearing ? undefined : clearMemory}
            danger
            right={clearing ? <Loader2 className="size-4 animate-spin text-destructive" /> : <RefreshCcw className="size-4 text-destructive" />}
          />
        </Card>
        <p className="text-[11px] text-muted-foreground px-1 pt-3 leading-relaxed">
          LEX uses memories to give you more personalised responses. Memories are stored locally and never shared.
        </p>
      </div>
    </div>
  )
}

/* ── NOTIFICATIONS ── */
function NotificationsPage({ onBack, settings, update }: PageProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="Notifications" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <SectionLabel>Alerts</SectionLabel>
        <Card>
          <SettingRow
            label="Do Not Disturb"
            sub="Mute voice responses and suppress alerts"
            right={<Toggle on={settings.dnd} onToggle={() => update("dnd", !settings.dnd)} />}
          />
          <SettingRow
            label="Notification Sounds"
            sub="Play sounds for alerts and updates"
            right={<Toggle on={settings.notifSound} onToggle={() => update("notifSound", !settings.notifSound)} />}
          />
        </Card>
      </div>
    </div>
  )
}

/* ── PRIVACY ── */
function PrivacyPage({ onBack }: PageProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="Privacy & Security" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <SectionLabel>Data</SectionLabel>
        <Card>
          <SettingRow label="Conversation Data" sub="Stored locally on this device only" right={<span className="text-xs text-green-400 font-medium">Local</span>} />
          <SettingRow label="AI Memories" sub="Stored locally, never sent to third parties" right={<span className="text-xs text-green-400 font-medium">Local</span>} />
          <SettingRow label="Voice Processing" sub="Edge TTS — audio not stored" right={<span className="text-xs text-green-400 font-medium">Private</span>} />
        </Card>
        <SectionLabel>Permissions</SectionLabel>
        <Card>
          <SettingRow label="Microphone" sub="Required for voice input" right={<span className="text-xs text-muted-foreground">When in use</span>} />
          <SettingRow label="Location" sub="Used for local weather only" right={<span className="text-xs text-muted-foreground">When in use</span>} />
        </Card>
      </div>
    </div>
  )
}

/* ── PREMIUM ── */
function PremiumPage({ onBack, activeTier, setActiveTier, bypassCode, setBypassCode, bypassLoading, bypassResult, onRedeem, onRevoke }: PageProps & {
  activeTier: PremiumTier | null; setActiveTier: (t: PremiumTier | null) => void
  bypassCode: string; setBypassCode: (v: string) => void
  bypassLoading: boolean; bypassResult: { ok: boolean; msg: string } | null
  onRedeem: () => void; onRevoke: () => void
}) {
  const tiers = [
    { tier: "pro",   icon: "⚡", label: "LEX PRO",   color: "blue",   perks: ["GPT-4o class models", "Extended context", "Priority responses"] },
    { tier: "plus",  icon: "🚀", label: "LEX PLUS",  color: "purple", perks: ["All PRO features", "Reasoning models", "Unlimited memories"] },
    { tier: "ultra", icon: "👑", label: "LEX ULTRA", color: "amber",  perks: ["All PLUS features", "Earliest access", "Direct developer support"] },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="LEX Premium" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">

        {activeTier && activeTier !== "free" && (
          <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <p className="text-sm font-bold text-amber-400">✨ {activeTier.toUpperCase()} Active</p>
            <p className="text-xs text-amber-400/80 mt-0.5">Your premium access is active on this device.</p>
          </div>
        )}

        <SectionLabel>Access Tiers</SectionLabel>
        <div className="space-y-2">
          {tiers.map(t => (
            <div
              key={t.tier}
              className={cn(
                "rounded-2xl border px-4 py-3",
                activeTier === t.tier
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/60 bg-card",
              )}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{t.icon}</span>
                <span className="text-sm font-bold text-foreground">{t.label}</span>
                {activeTier === t.tier && <span className="ml-auto text-[10px] text-primary font-semibold">● Active</span>}
              </div>
              <ul className="space-y-0.5">
                {t.perks.map(p => (
                  <li key={p} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Check className="size-3 text-primary shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <SectionLabel>Activation Code</SectionLabel>
        <Card>
          <div className="p-3 space-y-2">
            <input
              value={bypassCode}
              onChange={e => setBypassCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && onRedeem()}
              placeholder="LEX-PRO-XXXX"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-mono tracking-widest text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={onRedeem}
              disabled={bypassLoading || !bypassCode.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {bypassLoading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              {bypassLoading ? "Verifying…" : "Activate Code"}
            </button>
            {bypassResult && (
              <p className={cn("text-xs text-center font-medium", bypassResult.ok ? "text-green-400" : "text-destructive")}>
                {bypassResult.msg}
              </p>
            )}
          </div>
        </Card>

        {activeTier && activeTier !== "free" && (
          <>
            <SectionLabel>Manage</SectionLabel>
            <Card>
              <SettingRow label="Revoke Access" sub="Return to free tier" danger onPress={onRevoke} />
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

/* ── DEVELOPER (only shown to developer role) ── */
function DeveloperPage({ onBack }: PageProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SubPageHeader title="Developer" onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <SectionLabel>Developer Tools</SectionLabel>
        <Card>
          <SettingRow label="Code Generator" sub="Generate premium activation codes" right={<ChevronRight className="size-4 text-muted-foreground" />} />
          <SettingRow label="User Management" sub="View and manage users" right={<ChevronRight className="size-4 text-muted-foreground" />} />
          <SettingRow label="Analytics" sub="Usage statistics" right={<ChevronRight className="size-4 text-muted-foreground" />} />
        </Card>
        <SectionLabel>System</SectionLabel>
        <Card>
          <SettingRow label="API Health" sub="Check all endpoints" right={<ChevronRight className="size-4 text-muted-foreground" />} />
          <SettingRow label="Feature Flags" sub="Enable/disable features" right={<ChevronRight className="size-4 text-muted-foreground" />} />
        </Card>
      </div>
    </div>
  )
}
