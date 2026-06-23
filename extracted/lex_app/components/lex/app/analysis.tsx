"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronLeft, Clock, TrendingUp, Shield, Settings2,
  CheckCircle2, AlertTriangle, Activity, Zap,
} from "lucide-react"
import type { AppShared, AnalysisSettings } from "./types"
import { cn } from "@/lib/utils"

interface ScreenStat { screen: string; ms: number }
interface DayStat    { day: string; ms: number }

const SCREEN_LABELS: Record<string, { label: string; color: string }> = {
  home:        { label: "Home",       color: "#3b82f6" },
  lex:         { label: "LEX Chat",   color: "#a855f7" },
  drawer:      { label: "Apps",       color: "#22c55e" },
  space:       { label: "Space",      color: "#06b6d4" },
  focus:       { label: "Focus",      color: "#f97316" },
  settings:    { label: "Settings",   color: "#6b7280" },
  memory:      { label: "Memory",     color: "#ec4899" },
  analysis:    { label: "Analysis",   color: "#eab308" },
  search:      { label: "Search",     color: "#ef4444" },
}

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function BarRow({ label, ms, total, color }: { label: string; ms: number; total: number; color: string }) {
  const pct = total > 0 ? (ms / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{fmtMs(ms)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-accent/40 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function AttentionAlert({ totalMs, limitMs }: { totalMs: number; limitMs: number }) {
  const pct = totalMs / limitMs
  if (pct < 0.7) return null
  const over = pct >= 1
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl border p-4 mb-4",
      over ? "border-red-500/40 bg-red-500/10" : "border-yellow-500/40 bg-yellow-500/10"
    )}>
      {over ? <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" /> : <Zap className="size-5 text-yellow-500 shrink-0 mt-0.5" />}
      <div>
        <p className={cn("text-sm font-semibold", over ? "text-red-400" : "text-yellow-400")}>
          {over ? "Daily limit exceeded" : "Approaching daily limit"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {fmtMs(totalMs)} used of {fmtMs(limitMs)} allowed today.
          {over ? " Take a break to protect your attention span." : " You're getting close."}
        </p>
      </div>
    </div>
  )
}

export function AnalysisScreen({ goBack, time }: AppShared) {
  const [tab, setTab]         = useState<"today" | "week" | "settings">("today")
  const [today, setToday]     = useState<ScreenStat[]>([])
  const [week, setWeek]       = useState<DayStat[]>([])
  const [settings, setSettings] = useState<AnalysisSettings>({
    daily_limit_minutes: 120, focus_apps: [], distraction_apps: [],
    wake_time: "07:00", sleep_time: "23:00", attention_threshold: 30,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/analysis?userId=local&type=all")
      const data = await res.json()
      setToday(data.today ?? [])
      setWeek(data.week ?? [])
      if (data.settings) setSettings(data.settings)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalTodayMs = today.reduce((sum, s) => sum + s.ms, 0)
  const limitMs      = settings.daily_limit_minutes * 60 * 1000
  const maxWeekMs    = Math.max(1, ...week.map(d => d.ms))

  const saveSettings = async () => {
    setSaving(true)
    try {
      await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "local", type: "settings", ...settings }),
      })
    } catch { /* ignore */ } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between px-6 pt-4 shrink-0 text-foreground">
        <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
        <span className="text-[11px] font-semibold text-primary">Analysis</span>
      </div>

      <div className="flex items-center gap-3 px-5 pt-3 pb-3 shrink-0">
        <button onClick={goBack} className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform">
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Personal Analysis</h1>
          <p className="text-[11px] text-muted-foreground">Today: {fmtMs(totalTodayMs)} • Limit: {settings.daily_limit_minutes}m</p>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 px-5 pb-3 shrink-0">
        {([
          { key: "today", label: "Today", icon: <Clock className="size-3.5" /> },
          { key: "week",  label: "Week",  icon: <TrendingUp className="size-3.5" /> },
          { key: "settings", label: "Limits", icon: <Settings2 className="size-3.5" /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
              tab === t.key ? "bg-primary text-primary-foreground" : "bg-accent/60 text-muted-foreground"
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Activity className="size-8 text-primary/40 animate-pulse" />
          </div>
        ) : (
          <>
            {tab === "today" && (
              <div className="space-y-4">
                <AttentionAlert totalMs={totalTodayMs} limitMs={limitMs} />

                {/* total circle summary */}
                <div className="flex items-center justify-center py-2">
                  <div className="relative flex size-28 items-center justify-center">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="8" className="text-accent/30" />
                      <circle
                        cx="50" cy="50" r="44" fill="none" stroke="var(--primary)" strokeWidth="8"
                        strokeDasharray={`${Math.min(100, (totalTodayMs / limitMs) * 276.5)} 276.5`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="text-center z-10">
                      <p className="text-lg font-bold text-foreground">{fmtMs(totalTodayMs)}</p>
                      <p className="text-[10px] text-muted-foreground">today</p>
                    </div>
                  </div>
                </div>

                {today.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">No activity recorded yet today</p>
                ) : (
                  <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Time Per Screen</p>
                    {today.map(s => {
                      const meta = SCREEN_LABELS[s.screen] ?? { label: s.screen, color: "#6b7280" }
                      return (
                        <BarRow key={s.screen} label={meta.label} ms={s.ms} total={totalTodayMs} color={meta.color} />
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "week" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-4">Daily Usage (7 days)</p>
                  {week.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">No weekly data yet</p>
                  ) : (
                    <div className="flex items-end gap-2 h-24">
                      {week.map(d => {
                        const pct = d.ms / maxWeekMs
                        const dayLabel = new Date(d.day).toLocaleDateString([], { weekday: "short" })
                        const overLimit = d.ms > limitMs
                        return (
                          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                            <div className="w-full rounded-t-sm transition-all" style={{
                              height: `${Math.max(4, pct * 80)}px`,
                              background: overLimit ? "#ef4444" : "var(--primary)",
                              opacity: 0.8,
                            }} />
                            <span className="text-[9px] text-muted-foreground">{dayLabel}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "settings" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Attention Protection</p>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-foreground">Daily screen limit</label>
                        <span className="text-sm font-bold text-primary">{settings.daily_limit_minutes}m</span>
                      </div>
                      <input
                        type="range" min={30} max={480} step={15}
                        value={settings.daily_limit_minutes}
                        onChange={e => setSettings(s => ({ ...s, daily_limit_minutes: Number(e.target.value) }))}
                        className="w-full accent-primary"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                        <span>30m</span><span>4h</span><span>8h</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-sm font-medium text-foreground">Alert when {">"}  continuous</label>
                        <span className="text-sm font-bold text-primary">{settings.attention_threshold}m</span>
                      </div>
                      <input
                        type="range" min={10} max={120} step={5}
                        value={settings.attention_threshold}
                        onChange={e => setSettings(s => ({ ...s, attention_threshold: Number(e.target.value) }))}
                        className="w-full accent-primary"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Wake time</label>
                        <input
                          type="time"
                          value={settings.wake_time}
                          onChange={e => setSettings(s => ({ ...s, wake_time: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Sleep time</label>
                        <input
                          type="time"
                          value={settings.sleep_time}
                          onChange={e => setSettings(s => ({ ...s, sleep_time: e.target.value }))}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={saving}
                  className="w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <div className="size-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <CheckCircle2 className="size-4" />}
                  Save Settings
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
