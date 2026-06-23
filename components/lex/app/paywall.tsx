"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import { Check, X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { PLANS, type PremiumTier } from "@/lib/quota"
import { cn } from "@/lib/utils"
import type { AppShared } from "./types"

interface PaywallProps extends AppShared {
  onSelectPlan: (tier: PremiumTier) => void
}

export function PaywallScreen({ goBack, onSelectPlan }: PaywallProps) {
  const [active, setActive] = useState(1)   // start on "Plus" (popular)
  const touchStartX         = useRef(0)

  const prev = () => setActive(a => Math.max(0, a - 1))
  const next = () => setActive(a => Math.min(PLANS.length - 1, a + 1))

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd   = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (diff >  50) next()
    if (diff < -50) prev()
  }

  const plan = PLANS[active]

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${plan.color1} 0%, #0a0a0a 100%)` }}
    >
      {/* ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{ background: `radial-gradient(ellipse 60% 40% at 50% 20%, ${plan.accent}18 0%, transparent 70%)` }}
      />

      {/* ── Fixed header ── */}
      <div className="relative shrink-0 flex items-center justify-between px-5 pt-5 pb-2">
        <button
          onClick={goBack}
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors active:scale-90"
        >
          <X className="size-4" />
        </button>
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5" style={{ color: plan.accent }} />
          <span className="text-xs font-semibold text-white/70">LEX Premium</span>
        </div>
        <div className="size-9" />
      </div>

      {/* ── Fixed sub-header ── */}
      <div className="relative shrink-0 px-5 pb-3 text-center">
        <Image
          src="/lex-orb.png" alt="LEX" width={48} height={48}
          className="mx-auto rounded-full shadow-2xl mb-2"
          style={{ filter: `drop-shadow(0 0 14px ${plan.accent}60)` }}
        />
        <h1 className="text-lg font-bold text-white">Upgrade LEX</h1>
        <p className="text-[11px] text-white/50">Swipe left or right to compare plans</p>
      </div>

      {/* ── Slider ── */}
      <div
        className="relative flex-1 min-h-0 overflow-hidden px-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* sliding row */}
        <div
          className="flex h-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(calc(-${active * (100 / PLANS.length)}%))`, width: `${PLANS.length * 100}%` }}
        >
          {PLANS.map((p, idx) => (
            <div
              key={p.tier}
              className="h-full"
              style={{ width: `${100 / PLANS.length}%` }}
            >
              {/* each card is its own flex column — button is always at bottom */}
              <div
                className={cn(
                  "relative mx-1 h-full flex flex-col rounded-3xl border transition-all duration-300",
                  idx === active
                    ? "border-white/20 shadow-2xl scale-100 opacity-100"
                    : "border-white/8 scale-95 opacity-50",
                )}
                style={{
                  background: `linear-gradient(145deg, ${p.color2}cc 0%, ${p.color1}ee 100%)`,
                  boxShadow: idx === active ? `0 0 40px ${p.accent}30` : "none",
                }}
              >
                {/* popular badge */}
                {"popular" in p && p.popular && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg z-10"
                    style={{ background: p.accent }}
                  >
                    Most Popular
                  </div>
                )}

                {/* plan header — shrink-0 so it never collapses */}
                <div className="shrink-0 text-center pt-5 px-5 pb-3">
                  <span className="text-3xl">{p.emoji}</span>
                  <h2 className="mt-1.5 text-2xl font-black text-white">{p.name}</h2>
                  <p className="text-xs text-white/50 mb-2">{p.tagline}</p>
                  <div className="flex items-end justify-center gap-1">
                    <span className="text-4xl font-black text-white">{p.price}</span>
                    <span className="mb-1.5 text-sm text-white/60">{p.period}</span>
                  </div>
                  <p className="text-[10px] text-white/35">Billed monthly · Cancel anytime</p>
                </div>

                {/* divider */}
                <div className="shrink-0 mx-5 h-px" style={{ background: `${p.accent}40` }} />

                {/* features — scrollable, takes remaining space */}
                <ul className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-2.5">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${p.accent}30`, color: p.accent }}
                      >
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                      <span className="text-sm text-white/80 leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                {/* ── CTA — always pinned at bottom ── */}
                <div className="shrink-0 px-5 pb-5 pt-3">
                  <button
                    onClick={() => onSelectPlan(p.tier)}
                    className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.97] shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${p.accent}, ${p.color2})` }}
                  >
                    Get {p.name} — {p.price}/mo
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Dots + nav arrows — always visible ── */}
      <div className="relative shrink-0 flex items-center justify-between px-5 py-3">
        <button
          onClick={prev}
          disabled={active === 0}
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-20 hover:bg-white/20 transition-all active:scale-90"
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="flex items-center gap-2">
          {PLANS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="rounded-full transition-all duration-200"
              style={{
                width:      i === active ? 20 : 6,
                height:     6,
                background: i === active ? plan.accent : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={active === PLANS.length - 1}
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-20 hover:bg-white/20 transition-all active:scale-90"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* continue free */}
      <div className="relative shrink-0 pb-5 text-center">
        <button
          onClick={goBack}
          className="text-xs text-white/40 hover:text-white/60 transition-colors underline underline-offset-2"
        >
          Continue with free (10 messages/day)
        </button>
      </div>
    </div>
  )
}
