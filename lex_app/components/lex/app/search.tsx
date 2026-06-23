"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  ChevronLeft, Search, X, Smartphone, Settings2,
  Brain, MessageSquare, Grid2x2, Loader2,
} from "lucide-react"
import type { AppShared, Screen } from "./types"
import { cn } from "@/lib/utils"

interface Result {
  type: string
  label: string
  sub?: string
  action?: string
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  app:     { icon: <Smartphone className="size-4" />, color: "#3b82f6" },
  setting: { icon: <Settings2 className="size-4" />, color: "#6b7280" },
  screen:  { icon: <Grid2x2 className="size-4" />,   color: "#a855f7" },
  memory:  { icon: <Brain className="size-4" />,      color: "#ec4899" },
  chat:    { icon: <MessageSquare className="size-4" />, color: "#22c55e" },
}

const RECENT_KEY = "lex-recent-searches-v1"

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") } catch { return [] }
}
function addRecent(q: string) {
  const list = [q, ...getRecent().filter(r => r !== q)].slice(0, 8)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

export function SearchScreen({ goBack, navigate, time }: AppShared) {
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState<Result[]>([])
  const [loading, setLoading]   = useState(false)
  const [recent, setRecent]     = useState<string[]>([])
  const inputRef                = useRef<HTMLInputElement>(null)
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""

  useEffect(() => {
    setRecent(getRecent())
    inputRef.current?.focus()
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setLoading(false); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&userId=local`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch { setResults([]) } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  const handleSelect = (result: Result) => {
    if (query.trim()) { addRecent(query.trim()); setRecent(getRecent()) }
    if (!result.action) return
    if (result.action.startsWith("navigate:")) {
      navigate(result.action.replace("navigate:", "") as Screen)
    } else if (result.action.startsWith("open:")) {
      const appName = result.action.replace("open:", "")
      navigate("drawer")
      setTimeout(() => {
        const ev = new CustomEvent("lex-open-app", { detail: { appName } })
        window.dispatchEvent(ev)
      }, 300)
    }
  }

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between px-6 pt-4 shrink-0 text-foreground">
        <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
        <span className="text-[11px] font-semibold text-primary">Search</span>
      </div>

      {/* header search bar */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-3 shrink-0">
        <button onClick={goBack} className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform">
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-sm">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search everything…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {loading ? (
            <Loader2 className="size-4 text-muted-foreground animate-spin shrink-0" />
          ) : query ? (
            <button onClick={() => { setQuery(""); setResults([]) }}>
              <X className="size-4 text-muted-foreground" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {!query && recent.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Recent</p>
              <button onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]) }} className="text-[11px] text-muted-foreground hover:text-primary">Clear</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map(r => (
                <button key={r} onClick={() => setQuery(r)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {!query && (
          <div className="mt-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-1 mb-3">Quick Access</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Memory Tree", screen: "memory", color: "#ec4899", emoji: "🧠" },
                { label: "Personal Analysis", screen: "analysis", color: "#f97316", emoji: "📊" },
                { label: "Permissions", screen: "permissions", color: "#3b82f6", emoji: "🔐" },
                { label: "Emergency", screen: "emergency", color: "#ef4444", emoji: "🆘" },
              ].map(item => (
                <button
                  key={item.screen}
                  onClick={() => navigate(item.screen as Screen)}
                  className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 text-left active:scale-95 transition-transform"
                >
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {query && results.length === 0 && !loading && (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <Search className="size-10 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground">No results for "{query}"</p>
            <p className="text-xs text-muted-foreground">Try different keywords or ask LEX directly</p>
            <button onClick={() => navigate("lex")} className="mt-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground">
              Ask LEX
            </button>
          </div>
        )}

        {Object.entries(grouped).map(([type, items]) => {
          const meta = TYPE_META[type] ?? { icon: <Search className="size-4" />, color: "#6b7280" }
          const typeLabel: Record<string, string> = {
            app: "Apps", setting: "Settings", screen: "LEX Screens", memory: "Memories", chat: "Chat History"
          }
          return (
            <div key={type} className="mb-4">
              <div className="flex items-center gap-2 px-1 mb-2">
                <span style={{ color: meta.color }}>{meta.icon}</span>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{typeLabel[type] ?? type}</p>
              </div>
              <div className="space-y-1">
                {items.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(r)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-accent/50 active:bg-accent transition-colors"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: meta.color + "20", color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                      {r.sub && <p className="text-[11px] text-muted-foreground">{r.sub}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
