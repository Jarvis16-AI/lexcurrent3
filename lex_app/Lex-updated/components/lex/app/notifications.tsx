"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import { X, MessageCircle, Cloud, Bell, Sparkles, ChevronRight } from "lucide-react"
import type { Weather } from "./types"
import { cn } from "@/lib/utils"

export interface Notification {
  id: string
  type: "lex" | "weather" | "message" | "reminder" | "system"
  title: string
  body: string
  time: string
  read: boolean
}

function notifIcon(type: Notification["type"]) {
  switch (type) {
    case "lex":      return <Image src="/lex-orb.png" alt="LEX" width={28} height={28} className="rounded-full" />
    case "weather":  return <div className="flex size-7 items-center justify-center rounded-full bg-sky-500/20 text-sky-500"><Cloud className="size-4" /></div>
    case "message":  return <div className="flex size-7 items-center justify-center rounded-full bg-green-500/20 text-green-500"><MessageCircle className="size-4" /></div>
    case "reminder": return <div className="flex size-7 items-center justify-center rounded-full bg-orange-500/20 text-orange-500"><Bell className="size-4" /></div>
    case "system":   return <div className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-primary"><Sparkles className="size-4" /></div>
  }
}

interface Props {
  open: boolean
  notifs: Notification[]
  onClose: () => void
  onDismiss: (id: string) => void
  onClearAll: () => void
  weather: Weather | null
}

export function NotificationPanel({ open, notifs, onClose, onDismiss, onClearAll, weather }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  /* close on outside tap */
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, onClose])

  return (
    <>
      {/* backdrop */}
      <div
        className={cn(
          "absolute inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* panel — slides down from top */}
      <div
        ref={ref}
        className={cn(
          "absolute inset-x-0 top-0 z-50 flex flex-col rounded-b-3xl bg-card/95 backdrop-blur-xl shadow-2xl border-b border-border/60 transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "-translate-y-full",
        )}
        style={{ maxHeight: "72%" }}
      >
        {/* handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-border/80" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">Notifications</h3>
            {weather && (
              <p className="text-[11px] text-muted-foreground">
                {weather.city} · {weather.temp}{weather.unit} {weather.icon}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifs.length > 0 && (
              <button
                onClick={onClearAll}
                className="rounded-full bg-accent/60 px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent active:scale-95 transition-transform"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="flex size-7 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* notification list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <Bell className="size-8 opacity-20 mb-2" />
              <p className="text-sm">You're all caught up</p>
            </div>
          ) : (
            notifs.map(n => (
              <div
                key={n.id}
                className={cn(
                  "group flex items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
                  n.read
                    ? "border-border/40 bg-accent/20"
                    : "border-border/70 bg-card shadow-sm",
                )}
              >
                <div className="shrink-0 mt-0.5">{notifIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className={cn("text-[13px] font-semibold leading-snug", n.read && "text-muted-foreground")}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{n.time}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground leading-snug line-clamp-2">{n.body}</p>
                </div>
                <button
                  onClick={() => onDismiss(n.id)}
                  className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

/* ── factory: generate smart notifications ── */
export function buildNotifications(weather: Weather | null): Notification[] {
  const now = new Date()
  const t   = (offset = 0) => {
    const d = new Date(now.getTime() - offset * 60000)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const base: Notification[] = [
    {
      id: "lex-1",
      type: "lex",
      title: "LEX",
      body:  "Good afternoon! You have 3 meetings today. Your next one starts at 2:00 PM.",
      time:  t(2),
      read:  false,
    },
    {
      id: "msg-1",
      type: "message",
      title: "WhatsApp · Sarah",
      body:  "Hey, are you joining the call at 3pm today?",
      time:  t(5),
      read:  false,
    },
    {
      id: "remind-1",
      type: "reminder",
      title: "Reminder",
      body:  "Team standup in 30 minutes",
      time:  t(8),
      read:  false,
    },
  ]

  if (weather) {
    base.splice(1, 0, {
      id:   "weather-1",
      type: "weather",
      title: `Weather · ${weather.city}`,
      body:  `Currently ${weather.temp}${weather.unit} and ${weather.label}. High of ${weather.high}° expected today.`,
      time:  t(12),
      read:  false,
    })
  }

  return base
}
