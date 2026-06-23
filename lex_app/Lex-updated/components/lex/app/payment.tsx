"use client"

import { useState } from "react"
import {
  ChevronLeft, Shield, CheckCircle2, Loader2,
  User, CreditCard, Lock, Calendar, KeyRound, Check,
} from "lucide-react"
import { PLANS, type PremiumTier, setPremium } from "@/lib/quota"
import type { AppShared } from "./types"
import { cn } from "@/lib/utils"

interface PaymentProps extends AppShared {
  selectedTier: PremiumTier
  onSuccess:    () => void
}

function formatCardNumber(val: string) {
  return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
}
function formatExpiry(val: string) {
  const d = val.replace(/\D/g, "").slice(0, 4)
  if (d.length >= 3) return d.slice(0, 2) + "/" + d.slice(2)
  return d
}
function formatCVC(val: string) { return val.replace(/\D/g, "").slice(0, 4) }

function luhn(num: string) {
  let s = 0, alt = false
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10)
    if (alt) { n *= 2; if (n > 9) n -= 9 }
    s += n; alt = !alt
  }
  return s % 10 === 0
}

function cardType(num: string): string {
  const n = num.replace(/\s/g, "")
  if (/^4/.test(n))                          return "VISA"
  if (/^5[1-5]/.test(n)||/^2[2-7]/.test(n)) return "MC"
  if (/^3[47]/.test(n))                      return "AMEX"
  if (/^6(?:011|5)/.test(n))                 return "DISC"
  return ""
}

/* ── Step indicator ─────────────────────────────────────────── */
function Steps({ current, accent }: { current: number; accent: string }) {
  const labels = ["Review", "Card", "Pay"]
  return (
    <div className="flex items-center justify-center gap-0 py-2">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center gap-0">
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300",
                i < current  ? "bg-green-500 text-white" :
                i === current ? "bg-white text-black" :
                "bg-white/15 text-white/40",
              )}
            >
              {i < current ? <Check className="size-3" strokeWidth={3} /> : i + 1}
            </div>
            <span className={cn(
              "text-[9px] font-semibold transition-colors",
              i === current ? "text-white" : "text-white/35",
            )}>
              {l}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div
              className="mx-2 mb-3 h-px w-8 rounded-full transition-all duration-500"
              style={{ background: i < current ? "#22c55e" : "rgba(255,255,255,0.15)" }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export function PaymentScreen({ goBack, selectedTier, onSuccess }: PaymentProps) {
  const plan = PLANS.find(p => p.tier === selectedTier) ?? PLANS[0]

  const [step,     setStep]    = useState(0)
  const [name,     setName]    = useState("")
  const [cardNum,  setCardNum] = useState("")
  const [expiry,   setExpiry]  = useState("")
  const [cvc,      setCvc]     = useState("")
  const [loading,  setLoading] = useState(false)
  const [done,     setDone]    = useState(false)
  const [errors,   setErrors]  = useState<Record<string, string>>({})

  const detected = cardType(cardNum)

  function validateCard() {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().split(" ").length < 2)
      e.name = "Enter your full name as it appears on the card."
    const raw = cardNum.replace(/\s/g, "")
    if (raw.length < 13)       e.card = "Enter a valid card number."
    else if (!luhn(raw))       e.card = "Card number is invalid."
    const [mm, yy] = expiry.split("/")
    const now = new Date()
    const em = parseInt(mm, 10), ey = parseInt("20" + yy, 10)
    if (!mm || !yy || expiry.length < 5 || em < 1 || em > 12)
      e.expiry = "Enter a valid expiry (MM/YY)."
    else if (ey < now.getFullYear() || (ey === now.getFullYear() && em < now.getMonth() + 1))
      e.expiry = "This card has expired."
    if (cvc.replace(/\D/g, "").length < 3) e.cvc = "Enter your 3- or 4-digit CVC."
    return e
  }

  const goToStep1 = () => setStep(1)
  const goToStep2 = () => {
    const e = validateCard()
    setErrors(e)
    if (!Object.keys(e).length) setStep(2)
  }

  const handlePay = async () => {
    setLoading(true)
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier:      selectedTier,
        amount:    plan.price,
        cardLast4: cardNum.replace(/\s/g, "").slice(-4),
        nameOnCard: name.trim(),
      }),
    }).catch(() => null)
    setLoading(false)
    if (res?.ok) {
      setDone(true)
      setPremium(selectedTier, 30)
      setTimeout(onSuccess, 2200)
    } else {
      setErrors({
        submit: "Payment processing not yet configured. Use a bypass code from Settings → About to access premium.",
      })
    }
  }

  /* ── Success ── */
  if (done) return (
    <div
      className="flex h-full flex-col items-center justify-center gap-5 px-8"
      style={{ background: `linear-gradient(160deg, ${plan.color1} 0%, #0a0a0a 100%)` }}
    >
      <div
        className="flex size-20 items-center justify-center rounded-full shadow-2xl"
        style={{ background: `${plan.accent}25`, border: `2px solid ${plan.accent}50` }}
      >
        <CheckCircle2 className="size-10" style={{ color: plan.accent }} />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-black text-white">Welcome to LEX {plan.name}!</h2>
        <p className="mt-2 text-sm text-white/60">Your subscription is now active. Redirecting…</p>
      </div>
    </div>
  )

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg, #050e1f 0%, #0a0a0a 100%)" }}
    >
      {/* ── Fixed header ── */}
      <div className="shrink-0 flex items-center gap-3 px-5 pt-5 pb-2">
        <button
          onClick={step === 0 ? goBack : () => { setStep(s => s - 1); setErrors({}) }}
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-90 transition-all"
        >
          <ChevronLeft className="size-5" />
        </button>
        <h1 className="text-base font-bold text-white flex-1">Secure Checkout</h1>
        <Shield className="size-4 text-green-400" />
      </div>

      {/* ── Step indicator ── */}
      <div className="shrink-0 px-5 pb-1">
        <Steps current={step} accent={plan.accent} />
      </div>

      {/* ════════════════════════════════
          STEP 0 — Review Plan
          ════════════════════════════════ */}
      {step === 0 && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
            {/* plan hero */}
            <div
              className="rounded-3xl border p-5 mb-4 text-center"
              style={{
                borderColor: `${plan.accent}40`,
                background:  `linear-gradient(145deg, ${plan.color2}cc 0%, ${plan.color1}ee 100%)`,
                boxShadow:   `0 0 40px ${plan.accent}20`,
              }}
            >
              <span className="text-4xl">{plan.emoji}</span>
              <h2 className="mt-2 text-2xl font-black text-white">LEX {plan.name}</h2>
              <p className="text-xs text-white/50 mt-0.5 mb-3">{plan.tagline}</p>
              <div className="flex items-end justify-center gap-1">
                <span className="text-4xl font-black text-white">{plan.price}</span>
                <span className="mb-1.5 text-sm text-white/60">/month</span>
              </div>
              <p className="text-[11px] text-white/35 mt-0.5">Billed monthly · Cancel anytime</p>
            </div>

            {/* features */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-3">What you get</p>
            <ul className="space-y-2.5">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: `${plan.accent}30`, color: plan.accent }}
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  <span className="text-sm text-white/75 leading-snug">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Fixed bottom CTA ── */}
          <div className="shrink-0 px-5 pb-6 pt-3 border-t border-white/5">
            <button
              onClick={goToStep1}
              className="w-full rounded-2xl py-4 text-base font-black text-white shadow-2xl transition-all active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${plan.accent}, ${plan.color2} 70%)` }}
            >
              Continue to Card Details →
            </button>
            <button onClick={goBack} className="mt-3 w-full text-xs text-white/30 hover:text-white/50 transition-colors">
              Go back
            </button>
          </div>
        </>
      )}

      {/* ════════════════════════════════
          STEP 1 — Card Details
          ════════════════════════════════ */}
      {step === 1 && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40 pt-1">Card Details</p>

            {/* Name */}
            <div className={cn("rounded-2xl border bg-white/5", errors.name ? "border-red-500/50" : "border-white/10")}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <User className="size-4 shrink-0 text-white/40" />
                <input
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: "" })) }}
                  placeholder="Full name on card"
                  autoComplete="cc-name"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                />
              </div>
            </div>
            {errors.name && <p className="text-[11px] text-red-400 px-1 -mt-1">{errors.name}</p>}

            {/* Card number */}
            <div className={cn("rounded-2xl border bg-white/5", errors.card ? "border-red-500/50" : "border-white/10")}>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <CreditCard className="size-4 shrink-0 text-white/40" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardNum}
                  onChange={e => { setCardNum(formatCardNumber(e.target.value)); setErrors(v => ({ ...v, card: "" })) }}
                  placeholder="0000 0000 0000 0000"
                  autoComplete="cc-number"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none font-mono tracking-wider"
                />
                {detected && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white/60 bg-white/10">
                    {detected}
                  </span>
                )}
              </div>
            </div>
            {errors.card && <p className="text-[11px] text-red-400 px-1 -mt-1">{errors.card}</p>}

            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className={cn("rounded-2xl border bg-white/5", errors.expiry ? "border-red-500/50" : "border-white/10")}>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <Calendar className="size-4 shrink-0 text-white/40" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={expiry}
                      onChange={e => { setExpiry(formatExpiry(e.target.value)); setErrors(v => ({ ...v, expiry: "" })) }}
                      placeholder="MM/YY"
                      autoComplete="cc-exp"
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none font-mono"
                    />
                  </div>
                </div>
                {errors.expiry && <p className="mt-1 text-[10px] text-red-400 px-1">{errors.expiry}</p>}
              </div>
              <div>
                <div className={cn("rounded-2xl border bg-white/5", errors.cvc ? "border-red-500/50" : "border-white/10")}>
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <KeyRound className="size-4 shrink-0 text-white/40" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cvc}
                      onChange={e => { setCvc(formatCVC(e.target.value)); setErrors(v => ({ ...v, cvc: "" })) }}
                      placeholder="CVC"
                      autoComplete="cc-csc"
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none font-mono"
                    />
                  </div>
                </div>
                {errors.cvc && <p className="mt-1 text-[10px] text-red-400 px-1">{errors.cvc}</p>}
              </div>
            </div>

            {/* security note */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <Lock className="size-3 text-white/25" />
              <p className="text-[10px] text-white/25">256-bit TLS encrypted · Your data is safe</p>
            </div>
          </div>

          {/* ── Fixed bottom CTA ── */}
          <div className="shrink-0 px-5 pb-6 pt-3 border-t border-white/5">
            <button
              onClick={goToStep2}
              className="w-full rounded-2xl py-4 text-base font-black text-white shadow-2xl transition-all active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${plan.accent}, ${plan.color2} 70%)` }}
            >
              Review Order →
            </button>
          </div>
        </>
      )}

      {/* ════════════════════════════════
          STEP 2 — Confirm & Pay
          ════════════════════════════════ */}
      {step === 2 && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 space-y-4">
            {/* order summary */}
            <div
              className="rounded-2xl border p-4"
              style={{ borderColor: `${plan.accent}40`, background: `${plan.accent}12` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Order Summary</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{plan.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-white">LEX {plan.name}</p>
                    <p className="text-[11px] text-white/50">{plan.tagline}</p>
                  </div>
                </div>
                <p className="text-xl font-black text-white">{plan.price}</p>
              </div>
            </div>

            {/* card summary */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">Paying With</p>
              <div className="flex items-center gap-3">
                <CreditCard className="size-4 text-white/50" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    {detected ? `${detected} ` : ""}•••• {cardNum.replace(/\s/g, "").slice(-4) || "????"}
                  </p>
                  <p className="text-[11px] text-white/40">{name || "—"} · Expires {expiry || "—"}</p>
                </div>
              </div>
            </div>

            {/* total */}
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Total due today</span>
                <span className="text-xl font-black text-white">{plan.price}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-white/35">Billed monthly · Cancel anytime</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{ background: `${plan.accent}25`, color: plan.accent }}
                >
                  Auto-renews
                </span>
              </div>
            </div>

            {/* error */}
            {errors.submit && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <p className="text-xs font-semibold text-amber-400">⚠️ Payment unavailable</p>
                <p className="mt-1 text-[11px] text-amber-400/80">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* ── Fixed bottom CTA ── */}
          <div className="shrink-0 px-5 pb-6 pt-3 border-t border-white/5">
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full rounded-2xl py-4 text-base font-black text-white shadow-2xl transition-all active:scale-[0.98] disabled:opacity-70"
              style={{ background: `linear-gradient(135deg, ${plan.accent}, ${plan.color2} 70%)` }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" /> Processing…
                </span>
              ) : (
                `Pay ${plan.price} · Confirm`
              )}
            </button>
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <Lock className="size-3 text-white/25" />
              <p className="text-[10px] text-white/25">Encrypted · Secure payment</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
