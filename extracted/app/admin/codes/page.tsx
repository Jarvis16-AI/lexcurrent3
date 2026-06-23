"use client"

import { useState, useEffect, useCallback } from "react"

type Tier = "pro" | "plus" | "ultra"

interface BypassCode {
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

const TIER_COLORS: Record<string, string> = {
  pro:   "bg-blue-500/20 text-blue-300 border-blue-500/30",
  plus:  "bg-purple-500/20 text-purple-300 border-purple-500/30",
  ultra: "bg-amber-500/20 text-amber-300 border-amber-500/30",
}

const TIER_LABELS: Record<string, string> = {
  pro: "PRO", plus: "PLUS", ultra: "ULTRA",
}

export default function AdminCodesPage() {
  const [adminKey,   setAdminKey]   = useState("")
  const [inputKey,   setInputKey]   = useState("")
  const [authed,     setAuthed]     = useState(false)
  const [keyError,   setKeyError]   = useState("")

  const [codes,      setCodes]      = useState<BypassCode[]>([])
  const [loading,    setLoading]    = useState(false)
  const [creating,   setCreating]   = useState(false)
  const [msg,        setMsg]        = useState<{ text: string; ok: boolean } | null>(null)
  const [copied,     setCopied]     = useState<string | null>(null)

  /* Create-form state */
  const [tier,        setTier]        = useState<Tier>("pro")
  const [label,       setLabel]       = useState("")
  const [uses,        setUses]        = useState<string>("")
  const [expiryDays,  setExpiryDays]  = useState<string>("30")
  const [customCode,  setCustomCode]  = useState("")

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 4000)
  }

  const fetchCodes = useCallback(async (key: string) => {
    setLoading(true)
    try {
      const r = await fetch("/api/bypass", { headers: { "x-admin-key": key } })
      if (r.status === 403) { setKeyError("Wrong admin key."); setAuthed(false); return }
      if (r.status === 503) { setKeyError("ADMIN_SECRET_KEY is not set in server env vars."); setAuthed(false); return }
      const data = await r.json()
      setCodes(data.codes ?? [])
    } catch {
      flash("Failed to load codes.", false)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLogin = async () => {
    setKeyError("")
    const r = await fetch("/api/bypass", { headers: { "x-admin-key": inputKey } })
    if (r.ok) {
      setAdminKey(inputKey)
      setAuthed(true)
      const data = await r.json()
      setCodes(data.codes ?? [])
    } else if (r.status === 503) {
      setKeyError("ADMIN_SECRET_KEY is not set in server environment variables.")
    } else {
      setKeyError("Invalid admin key.")
    }
  }

  useEffect(() => {
    if (authed && adminKey) fetchCodes(adminKey)
  }, [authed, adminKey, fetchCodes])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim()) { flash("Label is required.", false); return }
    setCreating(true)
    try {
      const r = await fetch("/api/bypass/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({
          tier,
          label:      label.trim(),
          uses:       uses ? Number(uses) : null,
          expiryDays: expiryDays ? Number(expiryDays) : null,
          customCode: customCode.trim() || undefined,
        }),
      })
      const data = await r.json()
      if (!r.ok) { flash(data.error ?? "Failed to create code.", false); return }
      flash(`Code created: ${data.code.code}`, true)
      setLabel(""); setCustomCode(""); setUses(""); setExpiryDays("30")
      await fetchCodes(adminKey)
    } finally {
      setCreating(false)
    }
  }

  const handleDeactivate = async (code: string) => {
    if (!confirm(`Deactivate ${code}?`)) return
    const r = await fetch("/api/bypass", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ code }),
    })
    if (r.ok) { flash(`${code} deactivated.`); await fetchCodes(adminKey) }
    else flash("Failed to deactivate.", false)
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 1800)
  }

  const activeCodes   = codes.filter(c => c.active)
  const inactiveCodes = codes.filter(c => !c.active)

  /* ── Login screen ────────────────────────────────────────────────── */
  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <div className="text-2xl font-bold text-white tracking-tight">LEX Admin</div>
            <div className="text-sm text-zinc-500">Bypass Code Generator</div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Admin Key</label>
              <input
                type="password"
                value={inputKey}
                onChange={e => setInputKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                placeholder="ADMIN_SECRET_KEY value"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
              {keyError && <p className="mt-1.5 text-xs text-red-400">{keyError}</p>}
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-white text-black font-semibold rounded-xl py-2.5 text-sm hover:bg-zinc-100 transition-colors"
            >
              Sign In
            </button>
          </div>
          <p className="text-center text-xs text-zinc-600">
            Set <code className="text-zinc-400">ADMIN_SECRET_KEY</code> in your environment variables to enable this panel.
          </p>
        </div>
      </div>
    )
  }

  /* ── Main dashboard ──────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Bypass Code Generator</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Generate access codes for paying users</p>
        </div>
        <button
          onClick={() => { setAuthed(false); setAdminKey(""); setInputKey("") }}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.ok ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25" : "bg-red-500/15 text-red-300 border border-red-500/25"}`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active codes", value: activeCodes.length },
          { label: "Total redeemed", value: codes.reduce((s, c) => s + c.used_count, 0) },
          { label: "Inactive", value: inactiveCodes.length },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Create form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Generate New Code</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tier */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Plan Tier</label>
              <div className="flex gap-2">
                {(["pro", "plus", "ultra"] as Tier[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTier(t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${tier === t ? TIER_COLORS[t] + " border-opacity-100" : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-zinc-300"}`}
                  >
                    {TIER_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Label <span className="text-zinc-600">(who is this for?)</span></label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. John Doe — paid via EcoNet"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Uses */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Max uses <span className="text-zinc-600">(leave blank for unlimited)</span>
              </label>
              <input
                type="number"
                min="1"
                value={uses}
                onChange={e => setUses(e.target.value)}
                placeholder="1"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Expires in days <span className="text-zinc-600">(blank = never)</span>
              </label>
              <input
                type="number"
                min="1"
                value={expiryDays}
                onChange={e => setExpiryDays(e.target.value)}
                placeholder="30"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Custom code */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Custom code <span className="text-zinc-600">(optional — auto-generated if blank)</span>
              </label>
              <input
                value={customCode}
                onChange={e => setCustomCode(e.target.value.toUpperCase())}
                placeholder="LEX-PR-XXXXXXXX"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-white text-black font-semibold rounded-xl py-2.5 text-sm hover:bg-zinc-100 disabled:opacity-50 transition-all"
          >
            {creating ? "Generating…" : "Generate Code"}
          </button>
        </form>
      </div>

      {/* Active codes table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-semibold">Active Codes</h2>
          <button
            onClick={() => fetchCodes(adminKey)}
            disabled={loading}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {activeCodes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-zinc-600">
            No active codes yet. Generate one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                  <th className="text-left px-6 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">Label</th>
                  <th className="text-left px-4 py-3 font-medium">Tier</th>
                  <th className="text-left px-4 py-3 font-medium">Uses</th>
                  <th className="text-left px-4 py-3 font-medium">Expires</th>
                  <th className="text-right px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {activeCodes.map(c => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-3">
                      <span className="font-mono text-xs text-white bg-zinc-800 px-2 py-1 rounded-lg">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 max-w-[200px] truncate">{c.label}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${TIER_COLORS[c.tier] ?? "bg-zinc-700 text-zinc-300 border-zinc-600"}`}>
                        {(c.tier ?? "").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {c.uses_left === null ? (
                        <span>∞ <span className="text-zinc-600">({c.used_count} used)</span></span>
                      ) : (
                        <span>{c.uses_left} left <span className="text-zinc-600">({c.used_count} used)</span></span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-6 py-3 text-right space-x-2">
                      <button
                        onClick={() => copyToClipboard(c.code)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      >
                        {copied === c.code ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={() => handleDeactivate(c.code)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inactive codes (collapsed) */}
      {inactiveCodes.length > 0 && (
        <details className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <summary className="px-6 py-4 text-sm text-zinc-500 cursor-pointer hover:text-zinc-300 select-none">
            {inactiveCodes.length} inactive / deactivated code{inactiveCodes.length !== 1 ? "s" : ""}
          </summary>
          <div className="overflow-x-auto border-t border-zinc-800">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-zinc-800/40">
                {inactiveCodes.map(c => (
                  <tr key={c.id} className="opacity-50">
                    <td className="px-6 py-2.5">
                      <span className="font-mono text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-lg line-through">
                        {c.code}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 text-xs">{c.label}</td>
                    <td className="px-4 py-2.5 text-zinc-600 text-xs">{(c.tier ?? "").toUpperCase()}</td>
                    <td className="px-4 py-2.5 text-zinc-600 text-xs">{c.used_count} used</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Setup instructions */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 text-xs text-zinc-500 space-y-1.5">
        <div className="font-medium text-zinc-400 mb-2">Setup &amp; workflow</div>
        <div>1. Set <code className="text-zinc-300 bg-zinc-800 px-1 rounded">ADMIN_SECRET_KEY</code> to a strong random value in your environment variables (Secrets tab)</div>
        <div>2. User pays you via any method → you come here and generate a code for their plan</div>
        <div>3. Send the code to the user — they enter it in the LEX app under Settings → Enter Code</div>
        <div>4. Set "Max uses" to 1 for single-user codes, or higher for team/shared codes</div>
        <div>5. Set expiry days to match the subscription period (e.g. 30 = monthly, 365 = yearly)</div>
      </div>
    </div>
  )
}
