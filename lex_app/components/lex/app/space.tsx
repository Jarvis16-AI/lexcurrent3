"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import {
  ChevronLeft, Navigation, MessageCircle, Calendar,
  CloudRain, Sparkles, ChevronRight, Bell, Loader2,
} from "lucide-react"
import type { AppShared, Msg } from "./types"
import { cn } from "@/lib/utils"

function StatusBar({ time }: { time: Date | null }) {
  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
  return (
    <div className="flex items-center justify-between px-6 pt-4 text-foreground">
      <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
      <span className="text-[11px] font-semibold text-primary">LEX Space</span>
    </div>
  )
}

const QUICK_ACTIONS = [
  { icon: <Navigation className="size-4 text-primary" />,      text: "Navigate home",    query: "Give me the best route home right now" },
  { icon: <MessageCircle className="size-4 text-primary" />,   text: "Draft a reply",    query: "Help me draft a professional reply to an email" },
  { icon: <Calendar className="size-4 text-primary" />,        text: "Plan my day",      query: "Help me plan my day efficiently" },
  { icon: <Sparkles className="size-4 text-primary" />,        text: "Inspire me",       query: "Give me one powerful motivational insight for today" },
]

export function SpaceScreen({ goBack, time, weather, sendMessage }: AppShared) {
  const [briefing,     setBriefing]     = useState<string | null>(null)
  const [loadBriefing, setLoadBriefing] = useState(false)

  const hour = (time ?? new Date()).getHours()
  const greeting =
    hour < 12 ? "Good Morning" :
    hour < 17 ? "Good Afternoon" :
    "Good Evening"

  /* auto-fetch morning/evening briefing */
  useEffect(() => {
    const fetchBriefing = async () => {
      setLoadBriefing(true)
      const ctx = weather
        ? `City: ${weather.city}. Weather: ${weather.temp}${weather.unit}, ${weather.label}.`
        : ""
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Give me a very short, friendly daily briefing for now. 2-3 sentences max." }],
            context: ctx,
          }),
        })
        const data = await res.json()
        setBriefing(data.reply ?? null)
      } catch {
        setBriefing("LEX is ready to help you today. Tap any action below.")
      } finally {
        setLoadBriefing(false)
      }
    }
    fetchBriefing()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <StatusBar time={time} />

      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-2">
        <button
          onClick={goBack}
          className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="leading-tight">
          <p className="text-sm text-muted-foreground">{greeting}</p>
          <h2 className="text-xl font-bold text-primary">LEX Space</h2>
        </div>
      </div>

      {/* briefing card */}
      <div className="mx-5 mt-2 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/60 to-accent/30 p-4 shadow-sm border border-primary/10">
        <div className="flex items-start gap-3">
          <Image src="/lex-orb.png" alt="LEX" width={36} height={36} className="rounded-full mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-primary mb-1">Your Daily Briefing</p>
            {loadBriefing ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span className="text-xs">Preparing…</span>
              </div>
            ) : (
              <p className="text-sm text-foreground leading-relaxed">{briefing}</p>
            )}
          </div>
        </div>
      </div>

      {/* weather info row */}
      {weather && (
        <div className="mx-5 mt-3 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{weather.icon}</span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">{weather.temp}{weather.unit} · {weather.label}</p>
              <p className="text-xs text-muted-foreground">{weather.city} · H {weather.high}° L {weather.low}°</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      )}

      {/* event rows */}
      <div className="mx-5 mt-3 space-y-2">
        {[
          { icon: <Calendar className="size-4 text-primary" />,      title: "3 Meetings Today",     sub: "10:00 · 2:00 · 4:30 PM" },
          { icon: <MessageCircle className="size-4 text-primary" />, title: "12 Unread Messages",   sub: "Tap to view"             },
          { icon: <Bell className="size-4 text-primary" />,          title: "2 Reminders",          sub: "Due soon"                },
        ].map(row => (
          <div key={row.title} className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              {row.icon}
              <div className="leading-tight">
                <p className="text-xs font-semibold text-foreground">{row.title}</p>
                <p className="text-[10px] text-muted-foreground">{row.sub}</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        ))}
      </div>

      {/* quick actions */}
      <div className="mx-5 mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick Actions</p>
        <div className="rounded-3xl border border-border/70 bg-popover/80 p-3 backdrop-blur shadow-sm">
          {QUICK_ACTIONS.map(a => (
            <button
              key={a.text}
              onClick={() => sendMessage(a.query)}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-accent/60 active:bg-accent"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                {a.icon}
              </span>
              <span className="text-sm text-foreground">{a.text}</span>
              <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      <div className="h-4 shrink-0" />
    </div>
  )
}
