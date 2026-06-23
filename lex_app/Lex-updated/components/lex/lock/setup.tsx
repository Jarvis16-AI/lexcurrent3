"use client"

import { useState } from "react"
import Image from "next/image"
import {
  Hash, Grid3x3, KeyRound, Scan, Mail, ChevronRight,
  CheckCircle2, Shield, ArrowLeft,
} from "lucide-react"
import type { LockType, LockConfig } from "./utils"
import { hashStr, setLockConfig } from "./utils"
import { PinPad }     from "./pin"
import { PatternLock } from "./pattern"
import { cn } from "@/lib/utils"

type Step = "choose" | "setup" | "confirm" | "recovery" | "done"

const LOCK_OPTIONS: { type: LockType; label: string; icon: React.ReactNode; sub: string }[] = [
  { type: "pin",      label: "PIN",      icon: <Hash    className="size-6" />, sub: "4–6 digit code"        },
  { type: "pattern",  label: "Pattern",  icon: <Grid3x3 className="size-6" />, sub: "Draw a connect pattern" },
  { type: "password", label: "Password", icon: <KeyRound className="size-6" />, sub: "Custom passphrase"      },
  { type: "face",     label: "Face ID",  icon: <Scan    className="size-6" />, sub: "Biometric unlock"       },
]

interface SetupProps {
  onComplete: (cfg: LockConfig) => void
}

export function LockSetup({ onComplete }: SetupProps) {
  const [step,          setStep]         = useState<Step>("choose")
  const [lockType,      setLockType]     = useState<LockType>("pin")
  const [pendingHash,   setPendingHash]  = useState("")
  const [recoveryEmail, setRecoveryEmail] = useState("")
  const [error,         setError]         = useState("")
  const [googleLinked,  setGoogleLinked]  = useState(false)
  const [pwInput,       setPwInput]       = useState("")
  const [pwConfirm,     setPwConfirm]     = useState("")
  const [confirmingPw,  setConfirmingPw]  = useState(false)

  /* ── step: choose ── */
  const chooseLock = (type: LockType) => {
    setLockType(type)
    setError("")
    if (type === "face") {
      enrollFace()
    } else {
      setStep("setup")
    }
  }

  /* ── Face ID enroll ── */
  const enrollFace = async () => {
    if (!("credentials" in navigator)) {
      setError("Face ID not supported on this browser.")
      return
    }
    try {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge:          crypto.getRandomValues(new Uint8Array(32)),
          rp:                 { name: "LEX AI", id: window.location.hostname },
          user:               { id: crypto.getRandomValues(new Uint8Array(16)), name: "lex-user", displayName: "LEX User" },
          pubKeyCredParams:   [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "preferred" },
          timeout:            60000,
        },
      }) as PublicKeyCredential | null
      if (cred) {
        const id = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)))
        setPendingHash(id)
        setStep("recovery")
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error"
      setError("Face ID enrollment failed: " + msg)
    }
  }

  /* ── PIN / Pattern completion in setup step ── */
  const handleSetupComplete = async (value: string) => {
    const h = await hashStr(value)
    setPendingHash(h)
    setStep("confirm")
    setError("")
  }

  /* ── confirm step ── */
  const handleConfirmComplete = async (value: string) => {
    const h = await hashStr(value)
    if (h !== pendingHash) {
      setError("Doesn't match — try again.")
    } else {
      setError("")
      setStep("recovery")
    }
  }

  /* ── password setup ── */
  const handlePasswordSetup = async () => {
    if (pwInput.length < 4) { setError("Password must be at least 4 characters."); return }
    const h = await hashStr(pwInput)
    setPendingHash(h)
    setError("")
    setStep("confirm")
    setPwInput("")
    setConfirmingPw(true)
  }

  const handlePasswordConfirm = async () => {
    const h = await hashStr(pwConfirm)
    if (h !== pendingHash) { setError("Doesn't match — try again."); return }
    setError("")
    setPwConfirm("")
    setConfirmingPw(false)
    setStep("recovery")
  }

  /* ── Google sign-in (calls NextAuth) ── */
  const handleGoogleLink = async () => {
    try {
      window.location.href = "/api/auth/signin/google?callbackUrl=/lock-callback"
    } catch {
      setError("Google sign-in unavailable — enter your email for recovery.")
    }
  }

  /* ── finish setup ── */
  const finish = () => {
    const cfg: LockConfig = {
      isSetup:      true,
      lockType,
      lockHash:     pendingHash,
      recoveryEmail,
      googleLinked,
    }
    setLockConfig(cfg)
    onComplete(cfg)
  }

  /* ─────────────────────────────────────── renders ── */

  if (step === "choose") return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pb-6">
      <div className="flex items-center gap-3 pt-5 pb-4">
        <Image src="/lex-orb.png" alt="LEX" width={36} height={36} className="rounded-full" />
        <div>
          <p className="text-xs text-muted-foreground">LEX Launcher</p>
          <h2 className="text-xl font-bold text-foreground">Secure your LEX</h2>
        </div>
      </div>
      <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
        Choose a screen lock method. You can always change it later in settings.
      </p>
      {error && <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>}
      <div className="space-y-3">
        {LOCK_OPTIONS.map(o => (
          <button
            key={o.type}
            onClick={() => chooseLock(o.type)}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 text-left shadow-sm hover:bg-accent/40 active:bg-accent/60 transition-colors"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {o.icon}
            </span>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{o.label}</p>
              <p className="text-xs text-muted-foreground">{o.sub}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        ))}
      </div>
      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Your lock is stored securely on this device.
      </p>
    </div>
  )

  if (step === "setup") return (
    <div className="flex h-full flex-col items-center justify-center px-5 pb-6 gap-6">
      <button onClick={() => setStep("choose")} className="self-start flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back
      </button>

      {lockType === "pin" && (
        <PinPad mode="setup" onComplete={handleSetupComplete} error={error} />
      )}
      {lockType === "pattern" && (
        <PatternLock mode="setup" onComplete={handleSetupComplete} error={error} />
      )}
      {lockType === "password" && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-sm font-medium text-muted-foreground">Create a password</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <input
            type="password"
            value={pwInput}
            onChange={e => setPwInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handlePasswordSetup()}
            placeholder="Enter password…"
            className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm text-foreground outline-none focus:ring-2 ring-primary"
          />
          <button
            onClick={handlePasswordSetup}
            className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )

  if (step === "confirm") return (
    <div className="flex h-full flex-col items-center justify-center px-5 pb-6 gap-6">
      {lockType === "pin" && (
        <PinPad mode="confirm" onComplete={handleConfirmComplete} error={error} />
      )}
      {lockType === "pattern" && (
        <PatternLock mode="confirm" onComplete={handleConfirmComplete} error={error} />
      )}
      {lockType === "password" && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-sm font-medium text-muted-foreground">Confirm your password</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <input
            type="password"
            value={pwConfirm}
            onChange={e => setPwConfirm(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handlePasswordConfirm()}
            placeholder="Re-enter password…"
            className="w-full rounded-full border border-border bg-card px-5 py-3 text-sm text-foreground outline-none focus:ring-2 ring-primary"
          />
          <button onClick={handlePasswordConfirm} className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform">
            Confirm
          </button>
        </div>
      )}
    </div>
  )

  if (step === "recovery") return (
    <div className="flex h-full flex-col overflow-y-auto px-5 pb-6">
      <div className="pt-5 pb-4">
        <Shield className="size-8 text-primary mb-2" />
        <h2 className="text-xl font-bold text-foreground">Recovery Options</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If you forget your lock, you can recover access with these options.
        </p>
      </div>

      {/* Google button */}
      <button
        onClick={handleGoogleLink}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 mb-3 hover:bg-accent/40 active:bg-accent/60 transition-colors shadow-sm"
      >
        <svg className="size-5 shrink-0" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">Sign in with Google</p>
          <p className="text-[11px] text-muted-foreground">Use your Google account for recovery</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </button>

      {/* email recovery */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4 shadow-sm">
        <label className="flex items-center gap-2 mb-2 text-sm font-medium text-foreground">
          <Mail className="size-4 text-primary" /> Recovery Email
        </label>
        <input
          type="email"
          value={recoveryEmail}
          onChange={e => setRecoveryEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 ring-primary"
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          We'll verify this email if you need to reset your lock.
        </p>
      </div>

      <div className="mt-auto space-y-2 pt-2">
        <button
          onClick={finish}
          className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform shadow-md"
        >
          Finish Setup
        </button>
        <button onClick={finish} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground">
          Skip for now
        </button>
      </div>
    </div>
  )

  /* done */
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-5">
      <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
        <CheckCircle2 className="size-10 text-primary" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">You're all set!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your LEX launcher is now secured with {lockType === "face" ? "Face ID" : lockType.toUpperCase()}.
        </p>
      </div>
      <button
        onClick={finish}
        className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-transform shadow-md"
      >
        Open LEX
      </button>
    </div>
  )
}
