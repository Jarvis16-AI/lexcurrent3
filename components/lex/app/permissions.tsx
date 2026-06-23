"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, Mic, Camera, MapPin, Bell, Monitor, HardDrive, CheckCircle2, XCircle, AlertCircle, ChevronRight } from "lucide-react"
import type { AppShared } from "./types"
import { cn } from "@/lib/utils"

type PermState = "granted" | "denied" | "prompt" | "unavailable" | "checking"

interface Permission {
  key: string
  label: string
  desc: string
  why: string
  icon: React.ReactNode
  color: string
  state: PermState
}

const BASE_PERMS: Omit<Permission, "state">[] = [
  {
    key: "microphone",
    label: "Microphone",
    desc: "Voice input and commands",
    why: "Required for voice-to-text, voice commands, and hands-free LEX interaction.",
    icon: <Mic className="size-5" />,
    color: "#ef4444",
  },
  {
    key: "camera",
    label: "Camera",
    desc: "Photo sharing and visual context",
    why: "Used when you share photos with LEX for analysis or attach images to messages.",
    icon: <Camera className="size-5" />,
    color: "#f97316",
  },
  {
    key: "location",
    label: "Location",
    desc: "Weather, maps, local context",
    why: "Used to show accurate local weather and to give LEX location-aware responses.",
    icon: <MapPin className="size-5" />,
    color: "#3b82f6",
  },
  {
    key: "notifications",
    label: "Notifications",
    desc: "Attention alerts and reminders",
    why: "Lets LEX send attention alerts, focus reminders, and daily summaries.",
    icon: <Bell className="size-5" />,
    color: "#eab308",
  },
  {
    key: "screen",
    label: "Screen Capture",
    desc: "Screen awareness for orb context",
    why: "Lets the floating LEX orb read what's on screen to give contextual suggestions.",
    icon: <Monitor className="size-5" />,
    color: "#a855f7",
  },
  {
    key: "storage",
    label: "Storage",
    desc: "Local data, history, memory tree",
    why: "LEX stores your chat history, settings, and memory tree locally on this device.",
    icon: <HardDrive className="size-5" />,
    color: "#22c55e",
  },
]

function StateIcon({ state }: { state: PermState }) {
  if (state === "granted")     return <CheckCircle2 className="size-5 text-green-500" />
  if (state === "denied")      return <XCircle className="size-5 text-red-500" />
  if (state === "unavailable") return <XCircle className="size-5 text-muted-foreground" />
  if (state === "checking")    return <div className="size-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  return <AlertCircle className="size-5 text-yellow-500" />
}

function StateLabel({ state }: { state: PermState }) {
  const map: Record<PermState, { text: string; cls: string }> = {
    granted:     { text: "Granted",     cls: "text-green-500" },
    denied:      { text: "Denied",      cls: "text-red-500"   },
    prompt:      { text: "Not set",     cls: "text-yellow-500"},
    unavailable: { text: "Unavailable", cls: "text-muted-foreground" },
    checking:    { text: "Checking…",   cls: "text-muted-foreground" },
  }
  const { text, cls } = map[state]
  return <span className={cn("text-[11px] font-semibold", cls)}>{text}</span>
}

export function PermissionsScreen({ goBack, time }: AppShared) {
  const [perms, setPerms] = useState<Permission[]>(
    BASE_PERMS.map(p => ({ ...p, state: "checking" as PermState }))
  )
  const [expanded, setExpanded] = useState<string | null>(null)

  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""

  useEffect(() => {
    checkAll()
  }, [])

  async function checkPerm(key: string): Promise<PermState> {
    try {
      if (key === "microphone") {
        if (!navigator.mediaDevices) return "unavailable"
        const res = await navigator.permissions.query({ name: "microphone" as PermissionName })
        return res.state as PermState
      }
      if (key === "camera") {
        if (!navigator.mediaDevices) return "unavailable"
        const res = await navigator.permissions.query({ name: "camera" as PermissionName })
        return res.state as PermState
      }
      if (key === "location") {
        if (!navigator.geolocation) return "unavailable"
        const res = await navigator.permissions.query({ name: "geolocation" as PermissionName })
        return res.state as PermState
      }
      if (key === "notifications") {
        if (!("Notification" in window)) return "unavailable"
        const s = Notification.permission
        return s === "default" ? "prompt" : (s as PermState)
      }
      if (key === "screen") {
        if (!navigator.mediaDevices || !("getDisplayMedia" in navigator.mediaDevices)) return "unavailable"
        return "prompt"
      }
      if (key === "storage") {
        try {
          localStorage.setItem("__perm_test__", "1")
          localStorage.removeItem("__perm_test__")
          return "granted"
        } catch { return "denied" }
      }
    } catch { /* ignore */ }
    return "prompt"
  }

  async function checkAll() {
    setPerms(BASE_PERMS.map(p => ({ ...p, state: "checking" as PermState })))
    const results = await Promise.all(BASE_PERMS.map(p => checkPerm(p.key)))
    setPerms(BASE_PERMS.map((p, i) => ({ ...p, state: results[i] })))
  }

  async function requestPerm(key: string) {
    try {
      if (key === "microphone") {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true })
        s.getTracks().forEach(t => t.stop())
      } else if (key === "camera") {
        const s = await navigator.mediaDevices.getUserMedia({ video: true })
        s.getTracks().forEach(t => t.stop())
      } else if (key === "location") {
        await new Promise<void>((res, rej) =>
          navigator.geolocation.getCurrentPosition(() => res(), () => rej())
        )
      } else if (key === "notifications") {
        await Notification.requestPermission()
      } else if (key === "screen") {
        const s = await (navigator.mediaDevices as MediaDevices & { getDisplayMedia: (c?: object) => Promise<MediaStream> }).getDisplayMedia({ video: true })
        s.getTracks().forEach(t => t.stop())
      }
    } catch { /* denied */ }
    const newState = await checkPerm(key)
    setPerms(prev => prev.map(p => p.key === key ? { ...p, state: newState } : p))
  }

  const granted   = perms.filter(p => p.state === "granted").length
  const total     = perms.filter(p => p.state !== "unavailable").length

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between px-6 pt-4 shrink-0 text-foreground">
        <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
        <span className="text-[11px] font-semibold text-primary">Permissions</span>
      </div>

      <div className="flex items-center gap-3 px-5 pt-3 pb-4 shrink-0">
        <button onClick={goBack} className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform">
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Permissions</h1>
          <p className="text-[11px] text-muted-foreground">{granted} of {total} features enabled</p>
        </div>
      </div>

      {/* progress bar */}
      <div className="px-5 pb-4 shrink-0">
        <div className="h-1.5 w-full rounded-full bg-accent/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${total > 0 ? (granted / total) * 100 : 0}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {granted < total ? `Grant all permissions for the best LEX experience` : "All permissions granted ✓"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
        {perms.map(perm => (
          <div
            key={perm.key}
            className="rounded-2xl border border-border/70 bg-card overflow-hidden"
          >
            <button
              className="flex w-full items-center gap-3 p-4 text-left"
              onClick={() => setExpanded(expanded === perm.key ? null : perm.key)}
            >
              <div className="flex size-10 items-center justify-center rounded-xl shrink-0"
                style={{ background: perm.color + "25", color: perm.color }}>
                {perm.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{perm.label}</p>
                <p className="text-[11px] text-muted-foreground">{perm.desc}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StateIcon state={perm.state} />
                <ChevronRight className={cn("size-4 text-muted-foreground/50 transition-transform", expanded === perm.key && "rotate-90")} />
              </div>
            </button>

            {expanded === perm.key && (
              <div className="border-t border-border/50 px-4 pb-4 pt-3">
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{perm.why}</p>
                <div className="flex items-center justify-between">
                  <StateLabel state={perm.state} />
                  {perm.state !== "granted" && perm.state !== "unavailable" && perm.state !== "checking" && (
                    <button
                      onClick={() => requestPerm(perm.key)}
                      className="rounded-full px-4 py-1.5 text-xs font-bold text-white transition-colors"
                      style={{ background: perm.color }}
                    >
                      Enable
                    </button>
                  )}
                  {perm.state === "denied" && (
                    <p className="text-[10px] text-muted-foreground">Allow in browser settings</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
