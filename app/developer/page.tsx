"use client"

import { useEffect, useState, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import {
  Plus, RefreshCcw, Shield, Code2, Users, BarChart2,
  ChevronLeft, Check, X, Loader2, Copy, Eye, EyeOff,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Code {
  id:         number
  code:       string
  label:      string
  tier:       string
  uses_left:  number | null
  expires_at: string | null
  used_count: number
  active:     boolean
  created_at: string
}

type Tab = "codes" | "generate"

const TIER_BADGE: Record<string, string> = {
  ultra: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  plus:  "bg-purple-500/20 text-purple-400 border border-purple-500/30",
  pro:   "bg-blue-500/20 text-blue-400 border border-blue-500/30",
}

export default function DeveloperPortal() {
  const { user, isLoaded } = useUser()
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [tab,        setTab]        = useState<Tab>("codes")
  const [codes,      setCodes]      = useState<Code[]>([])
  const [loading,    setLoading]    = useState(false)
  const [copied,     setCopied]     = useState<string | null>(null)
  const [masked,     setMasked]     = useState(true)

  /* Form state */
  const [genTier,     setGenTier]     = useState<"pro" | "plus" | "ultra">("pro")
  const [genLabel,    setGenLabel]    = useState("")
  const [genDays,     setGenDays]     = useState<string>("365")
  const [genUses,     setGenUses]     = useState<string>("100")
  const [genResult,   setGenResult]   = useState<string | null>(null)
  const [generating,  setGenerating]  = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    fetch("/api/developer/status")
      .then(r => r.json())
      .then(d => setAuthorized(d.isDeveloper === true))
      .catch(() => setAuthorized(false))
  }, [isLoaded])

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    try {
      const d = await fetch("/api/developer/codes").then(r => r.json())
      setCodes(d.codes ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { if (authorized) fetchCodes() }, [authorized, fetchCodes])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const toggleCode = async (code: string, active: boolean) => {
    await fetch("/api/developer/codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, active }),
    })
    fetchCodes()
  }

  const generateCode = async () => {
    setGenerating(true); setGenResult(null)
    try {
      const res = await fetch("/api/developer/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier:         genTier,
          label:        genLabel || undefined,
          durationDays: genDays ? parseInt(genDays) : null,
          usesLeft:     genUses ? parseInt(genUses) : null,
        }),
      })
      const d = await res.json()
      if (d.ok) { setGenResult(d.code); fetchCodes() }
    } finally { setGenerating(false) }
  }

  if (!isLoaded || authorized === null) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center flex-col gap-4 px-6">
        <Shield className="size-12 text-red-500" />
        <h1 className="text-xl font-bold text-white">Access Denied</h1>
        <p className="text-stone-400 text-center text-sm max-w-xs">
          This portal is restricted to developer accounts. Your user ID must be registered.
        </p>
        <a href="/" className="mt-2 flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors">
          <ChevronLeft className="size-4" /> Back to LEX
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <a href="/" className="text-stone-500 hover:text-stone-300 transition-colors">
          <ChevronLeft className="size-5" />
        </a>
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Code2 className="size-5 text-amber-400" />
            LEX Developer Portal
          </h1>
          <p className="text-[11px] text-stone-500">Signed in as {user?.primaryEmailAddress?.emailAddress}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5">
            DEVELOPER
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 px-6">
        {([
          { key: "codes",    icon: <Shield className="size-4" />,   label: "Codes" },
          { key: "generate", icon: <Plus className="size-4" />,     label: "Generate" },
        ] as { key: Tab; icon: React.ReactNode; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors",
              tab === t.key
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-stone-500 hover:text-stone-300",
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
        <button
          onClick={fetchCodes}
          className="ml-auto flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors py-3"
        >
          <RefreshCcw className={cn("size-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* CODES TAB */}
        {tab === "codes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-stone-400">{codes.length} codes total · {codes.filter(c => c.active).length} active</p>
              <button
                onClick={() => setMasked(!masked)}
                className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 transition-colors"
              >
                {masked ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                {masked ? "Reveal codes" : "Mask codes"}
              </button>
            </div>

            {codes.length === 0 && !loading && (
              <div className="text-center py-12 text-stone-600">
                <Shield className="size-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No codes yet. Generate some in the Generate tab.</p>
              </div>
            )}

            {codes.map(c => (
              <div
                key={c.id}
                className={cn(
                  "rounded-2xl border px-4 py-3 transition-opacity",
                  c.active ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-50",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-white">
                        {masked ? c.code.replace(/[A-Z0-9]{4,}$/g, "•••••") : c.code}
                      </span>
                      <span className={cn("text-[9px] font-bold rounded px-1.5 py-0.5 uppercase tracking-wide", TIER_BADGE[c.tier] ?? TIER_BADGE.pro)}>
                        {c.tier}
                      </span>
                      {!c.active && <span className="text-[9px] text-red-400 font-semibold">DISABLED</span>}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{c.label}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-600">
                      <span>Used: {c.used_count}×</span>
                      <span>Remaining: {c.uses_left === null ? "∞" : c.uses_left}</span>
                      {c.expires_at && <span>Expires: {new Date(c.expires_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyCode(c.code)}
                      className="flex size-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      {copied === c.code ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                    </button>
                    <button
                      onClick={() => toggleCode(c.code, !c.active)}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg transition-colors",
                        c.active ? "bg-red-500/20 hover:bg-red-500/30 text-red-400" : "bg-green-500/20 hover:bg-green-500/30 text-green-400",
                      )}
                    >
                      {c.active ? <X className="size-3.5" /> : <Check className="size-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GENERATE TAB */}
        {tab === "generate" && (
          <div className="max-w-sm space-y-4">
            <h2 className="text-sm font-bold text-stone-300">Generate Activation Code</h2>

            <div>
              <label className="text-xs text-stone-500 mb-1.5 block font-medium">Tier</label>
              <div className="flex gap-2">
                {(["pro", "plus", "ultra"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setGenTier(t)}
                    className={cn(
                      "flex-1 rounded-xl border py-2.5 text-xs font-bold uppercase tracking-wide transition-all active:scale-95",
                      genTier === t
                        ? TIER_BADGE[t] + " scale-[1.02]"
                        : "border-white/10 text-stone-500 hover:border-white/20",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1.5 block font-medium">Label (optional)</label>
              <input
                value={genLabel}
                onChange={e => setGenLabel(e.target.value)}
                placeholder="e.g. Beta Tester Pass"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-stone-500 mb-1.5 block font-medium">Expires (days)</label>
                <input
                  value={genDays}
                  onChange={e => setGenDays(e.target.value)}
                  placeholder="365"
                  type="number"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-stone-500 mb-1.5 block font-medium">Max uses</label>
                <input
                  value={genUses}
                  onChange={e => setGenUses(e.target.value)}
                  placeholder="∞ = blank"
                  type="number"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-stone-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <button
              onClick={generateCode}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-black active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {generating ? "Generating…" : "Generate Code"}
            </button>

            {genResult && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
                <p className="text-xs text-green-400 font-medium mb-1">Code generated!</p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm font-bold text-white flex-1">{genResult}</code>
                  <button
                    onClick={() => copyCode(genResult)}
                    className="flex size-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    {copied === genResult ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
