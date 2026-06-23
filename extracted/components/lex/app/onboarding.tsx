"use client"

import { useState } from "react"
import { AnimatedOrb } from "../animated-orb"
import { haptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import { ACCENT_PRESETS, FALLBACK_VOICES } from "@/lib/settings"
import type { AppSettings, AIPersonality, Theme } from "@/lib/settings"
import { ChevronRight, Play, Loader2 } from "lucide-react"

const PERSONALITIES: { value: AIPersonality; emoji: string; label: string; desc: string }[] = [
  { value: "friendly",     emoji: "😊", label: "Friendly",     desc: "Warm, conversational, like a smart friend" },
  { value: "professional", emoji: "💼", label: "Professional", desc: "Clear, focused, business-appropriate" },
  { value: "concise",      emoji: "⚡", label: "Concise",      desc: "Short and sharp — no fluff, just answers" },
]

const THEMES: { value: Theme; emoji: string; label: string }[] = [
  { value: "dark",   emoji: "🌙", label: "Dark"   },
  { value: "light",  emoji: "☀️", label: "Light"  },
  { value: "system", emoji: "📱", label: "System" },
]

interface OnboardingProps {
  settings:        AppSettings
  onSettingsChange: (s: AppSettings) => void
  onComplete:      () => void
}

const ONBOARD_KEY = "lex-onboarded-v1"

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return true
  return !!localStorage.getItem(ONBOARD_KEY)
}

export function markOnboardingComplete() {
  try { localStorage.setItem(ONBOARD_KEY, "1") } catch {}
}

export function OnboardingScreen({ settings, onSettingsChange, onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [previewing, setPreviewing] = useState(false)
  const TOTAL = 3

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  const next = () => {
    haptic("success")
    if (step >= TOTAL - 1) {
      markOnboardingComplete()
      onComplete()
    } else {
      setStep(s => s + 1)
    }
  }

  const previewVoice = async () => {
    if (previewing) return
    setPreviewing(true)
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Hi! I'm LEX. I'm your intelligent AI launcher. Let's get started.",
          voiceId: settings.voiceId,
        }),
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

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 overflow-hidden">

      {/* progress dots */}
      <div className="flex justify-center gap-1.5 pt-10 pb-2 shrink-0">
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-300",
              i === step ? "w-6 h-1.5 bg-primary" : i < step ? "w-1.5 h-1.5 bg-primary/50" : "w-1.5 h-1.5 bg-white/20",
            )}
          />
        ))}
      </div>

      {/* scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">

        {/* Step 0 — Personality */}
        {step === 0 && (
          <div className="flex flex-col items-center animate-fade-up">
            <AnimatedOrb className="size-20 mt-6 mb-6" state="idle" />
            <h2 className="text-2xl font-bold text-white text-center">How should LEX talk?</h2>
            <p className="mt-2 text-sm text-stone-400 text-center mb-8">
              Pick a conversation style — you can always change this later.
            </p>
            <div className="w-full space-y-3">
              {PERSONALITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => { haptic("select"); update("aiPersonality", p.value) }}
                  className={cn(
                    "w-full flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.98]",
                    settings.aiPersonality === p.value
                      ? "border-primary/60 bg-primary/12 ring-1 ring-primary/30"
                      : "border-white/10 bg-white/5 hover:border-white/20",
                  )}
                >
                  <span className="text-3xl">{p.emoji}</span>
                  <div>
                    <p className={cn("text-sm font-semibold", settings.aiPersonality === p.value ? "text-primary" : "text-white")}>{p.label}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{p.desc}</p>
                  </div>
                  {settings.aiPersonality === p.value && (
                    <div className="ml-auto size-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-primary-foreground font-bold">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Voice */}
        {step === 1 && (
          <div className="flex flex-col items-center animate-fade-up">
            <AnimatedOrb className="size-20 mt-6 mb-6" state="speaking" />
            <h2 className="text-2xl font-bold text-white text-center">Pick LEX's voice</h2>
            <p className="mt-2 text-sm text-stone-400 text-center mb-6">
              Choose how LEX speaks to you.
            </p>

            <div className="w-full max-h-60 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 no-scrollbar">
              {FALLBACK_VOICES.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => { haptic("select"); update("voiceId", v.id); update("voiceName", v.name) }}
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-3 text-sm transition-colors",
                    i !== FALLBACK_VOICES.length - 1 && "border-b border-white/5",
                    settings.voiceId === v.id ? "bg-primary/15 text-primary" : "text-white hover:bg-white/5",
                  )}
                >
                  <span className="font-medium">{v.name}</span>
                  {settings.voiceId === v.id && <span className="text-primary text-xs font-bold">✓</span>}
                </button>
              ))}
            </div>

            <button
              onClick={previewVoice}
              disabled={previewing}
              className="mt-4 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {previewing
                ? <><Loader2 className="size-4 animate-spin" /> Playing…</>
                : <><Play className="size-4" /> Preview voice</>}
            </button>
          </div>
        )}

        {/* Step 2 — Theme + Accent */}
        {step === 2 && (
          <div className="flex flex-col items-center animate-fade-up">
            <AnimatedOrb className="size-20 mt-6 mb-6" state="idle" />
            <h2 className="text-2xl font-bold text-white text-center">Make it yours</h2>
            <p className="mt-2 text-sm text-stone-400 text-center mb-8">
              Pick a color theme and accent.
            </p>

            {/* theme */}
            <div className="w-full mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3">Theme</p>
              <div className="flex gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { haptic("select"); update("theme", t.value) }}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1.5 rounded-2xl border py-3 text-xs font-semibold transition-all active:scale-95",
                      settings.theme === t.value
                        ? "border-primary/60 bg-primary/12 text-primary ring-1 ring-primary/30"
                        : "border-white/10 bg-white/5 text-stone-400 hover:border-white/20",
                    )}
                  >
                    <span className="text-xl">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* accent */}
            <div className="w-full">
              <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3">Accent Color</p>
              <div className="flex flex-wrap gap-3">
                {ACCENT_PRESETS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { haptic("select"); update("accentPreset", p.key) }}
                    title={p.label}
                    className={cn(
                      "relative size-10 rounded-full transition-all active:scale-90",
                      settings.accentPreset === p.key && "ring-2 ring-offset-2 ring-white/60 scale-110",
                    )}
                    style={{ background: p.hex }}
                  >
                    {settings.accentPreset === p.key && (
                      <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold drop-shadow">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA button */}
      <div className="shrink-0 px-6 pb-8 pt-4">
        <button
          onClick={next}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25 active:scale-[0.97] transition-transform"
        >
          {step < TOTAL - 1 ? (
            <>Continue <ChevronRight className="size-5" /></>
          ) : (
            <>🚀 Launch LEX</>
          )}
        </button>
        {step === 0 && (
          <button
            onClick={() => { markOnboardingComplete(); onComplete() }}
            className="w-full text-center mt-3 text-xs text-stone-500 hover:text-stone-400 active:scale-95 transition-all"
          >
            Skip setup
          </button>
        )}
      </div>
    </div>
  )
}
