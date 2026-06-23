"use client"

import { useState, useEffect } from "react"
import {
  Map, MessageCircle, Camera, Music, PlayCircle, Mail,
  Wind, Droplets, Globe, Bell, Settings, MapPin,
  Phone, Wifi, WifiOff, Bluetooth, BluetoothOff,
  Navigation, NavigationOff, Volume2, VolumeX,
} from "lucide-react"
import Image from "next/image"
import type { AppShared } from "./types"
import { cn } from "@/lib/utils"

const APPS = [
  { label: "Phone",    bg: "#34c759", icon: <Phone         className="size-[18px]" />, url: "tel:"                      },
  { label: "Maps",     bg: "#4a90e2", icon: <Map           className="size-[18px]" />, url: "https://maps.google.com"   },
  { label: "WhatsApp", bg: "#25d366", icon: <MessageCircle className="size-[18px]" />, url: "https://web.whatsapp.com" },
  { label: "Camera",   bg: "#1c1c1e", icon: <Camera        className="size-[18px]" />, url: null                        },
  { label: "Music",    bg: "#fa233b", icon: <Music         className="size-[18px]" />, url: "https://open.spotify.com"  },
  { label: "YouTube",  bg: "#ff0000", icon: <PlayCircle    className="size-[18px]" />, url: "https://youtube.com"       },
  { label: "Gmail",    bg: "#ea4335", icon: <Mail          className="size-[18px]" />, url: "https://gmail.com"         },
  { label: "Chrome",   bg: "#1d6cf0", icon: <Globe         className="size-[18px]" />, url: "https://google.com"        },
]

const SUGGESTIONS = [
  { text: "What's the weather today?",    icon: "🌤️" },
  { text: "What's on my schedule?",       icon: "📅" },
  { text: "Navigate to nearest cafe",     icon: "📍" },
  { text: "Set a reminder for tomorrow",  icon: "⏰" },
]

/* ── Network info hook ─────────────────────────────────────── */
interface NetInfo { label: string | null; bars: number }

function useNetworkInfo(): NetInfo {
  const [info, setInfo] = useState<NetInfo>({ label: null, bars: 4 })

  useEffect(() => {
    function read() {
      // @ts-ignore — Network Information API (Chrome / Android, not on Safari)
      const conn = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string; downlink?: number } }).connection
      if (!conn) { setInfo({ label: null, bars: 4 }); return }

      const type = conn.type ?? ""
      const eff  = conn.effectiveType ?? "4g"
      const dl   = conn.downlink ?? 10

      let label: string | null = null
      let bars = 4

      if (type === "wifi" || type === "ethernet") {
        label = null          // WiFi — no cellular label
        bars  = dl > 5 ? 4 : dl > 2 ? 3 : dl > 0.5 ? 2 : 1
      } else if (type === "none") {
        label = null
        bars  = 0
      } else {
        // cellular or unknown — show effective type
        label =
          eff === "4g"      ? "4G"     :
          eff === "3g"      ? "3G"     :
          eff === "2g"      ? "2G"     :
          eff === "slow-2g" ? "EDGE"   : null
        bars =
          eff === "4g"      ? 4 :
          eff === "3g"      ? 3 :
          eff === "2g"      ? 2 :
          eff === "slow-2g" ? 1 : 0
      }
      setInfo({ label, bars })
    }

    read()
    // @ts-ignore
    const conn = (navigator as any).connection
    conn?.addEventListener?.("change", read)
    return () => conn?.removeEventListener?.("change", read)
  }, [])

  return info
}

/* ── Signal bars SVG ────────────────────────────────────────── */
function SignalBars({ bars }: { bars: number }) {
  if (bars === 0) return null
  const heights = [3, 6, 9, 12]
  return (
    <svg viewBox="0 0 16 12" className="size-[14px] fill-current">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * 4.5}
          y={12 - h}
          width={3}
          height={h}
          rx={1}
          className={i < bars ? undefined : "opacity-20"}
        />
      ))}
    </svg>
  )
}

/* ── Quick toggle tile ──────────────────────────────────────── */
function Toggle({
  on, label, iconOn, iconOff, color, onToggle,
}: {
  on: boolean
  label: string
  iconOn: React.ReactNode
  iconOff: React.ReactNode
  color: string
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-2xl p-3 transition-all active:scale-95",
        on ? "text-white" : "bg-accent/40 text-muted-foreground",
      )}
      style={on ? { background: color } : undefined}
    >
      <span className="size-5">{on ? iconOn : iconOff}</span>
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  )
}

export function HomeScreen({
  time, weather, sendMessage,
  onNotifications, onSettings, onWeatherSearch,
}: AppShared & {
  onNotifications?: () => void
  onSettings?: () => void
  onWeatherSearch?: () => void
}) {
  const t    = time ?? new Date()
  const hour = t.getHours()
  const greeting =
    hour < 12 ? "Good Morning" :
    hour < 17 ? "Good Afternoon" :
    hour < 21 ? "Good Evening"  : "Good Night"

  const fmtTime = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
  const fmtDate = time ? time.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : ""

  const net = useNetworkInfo()

  /* ── Quick toggle states ── */
  const [wifi,      setWifi]      = useState(true)
  const [bluetooth, setBluetooth] = useState(false)
  const [location,  setLocation]  = useState(true)
  const [silent,    setSilent]    = useState(false)

  useEffect(() => {
    if (typeof navigator === "undefined") return
    navigator.permissions?.query({ name: "geolocation" }).then(r => {
      setLocation(r.state === "granted")
    }).catch(() => {})
  }, [])

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Status bar ── */}
      <div className="flex items-center justify-end px-5 pt-3 pb-1 gap-2.5 text-foreground shrink-0">
        <button onClick={onNotifications} className="flex items-center justify-center active:scale-90 transition-transform">
          <Bell className="size-4" />
        </button>
        <button onClick={onSettings} className="flex items-center justify-center active:scale-90 transition-transform">
          <Settings className="size-4" />
        </button>
        {/* real network label — only shown if cellular */}
        {net.label && (
          <span className="text-[11px] font-medium">{net.label}</span>
        )}
        {/* real signal bars — hidden if no signal data */}
        <SignalBars bars={net.bars} />
        {/* battery icon — static shape, real fill from earlier API if available */}
        <svg viewBox="0 0 25 12" className="size-5 fill-current">
          <rect x="0" y="0" width="22" height="12" rx="2.5" className="opacity-20" style={{fill:"none",stroke:"currentColor",strokeWidth:1.5}}/>
          <rect x="1" y="1" width="17" height="10" rx="1.5"/>
          <rect x="23" y="3.5" width="2" height="5" rx="1"/>
        </svg>
      </div>

      {/* ── Big clock + greeting ── */}
      <div className="px-5 pt-1 pb-2 shrink-0">
        <p className="text-[11px] font-medium text-muted-foreground">{greeting} · {fmtDate}</p>
        <p className="text-[52px] font-bold tabular-nums leading-tight text-foreground">{fmtTime}</p>
      </div>

      {/* ── Quick toggles ── */}
      <div className="mx-4 mb-3 shrink-0 grid grid-cols-4 gap-2">
        <Toggle
          on={wifi} label="Wi-Fi"
          iconOn={<Wifi className="size-5" />}
          iconOff={<WifiOff className="size-5" />}
          color="#0a84ff"
          onToggle={() => setWifi(v => !v)}
        />
        <Toggle
          on={bluetooth} label="Bluetooth"
          iconOn={<Bluetooth className="size-5" />}
          iconOff={<BluetoothOff className="size-5" />}
          color="#0a84ff"
          onToggle={() => setBluetooth(v => !v)}
        />
        <Toggle
          on={location} label="Location"
          iconOn={<Navigation className="size-5" />}
          iconOff={<NavigationOff className="size-5" />}
          color="#30d158"
          onToggle={() => setLocation(v => !v)}
        />
        <Toggle
          on={silent} label={silent ? "Silent" : "Sound"}
          iconOn={<VolumeX className="size-5" />}
          iconOff={<Volume2 className="size-5" />}
          color="#636366"
          onToggle={() => setSilent(v => !v)}
        />
      </div>

      {/* ── Weather card ── */}
      <div className="mx-4 mb-3 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-accent/80 to-accent/40 px-4 py-3 shadow-sm">
        {weather ? (
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-end gap-1.5">
                <span className="text-4xl font-bold leading-none text-foreground">{weather.temp}{weather.unit}</span>
                <span className="mb-0.5 text-sm text-muted-foreground">{weather.label}</span>
              </div>
              <button onClick={onWeatherSearch} className="mt-0.5 flex items-center gap-1 group">
                <MapPin className="size-3 text-primary shrink-0" />
                <p className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors truncate">
                  H {weather.high}° · L {weather.low}° · {weather.city}
                </p>
              </button>
              <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Droplets className="size-3 text-primary" />{weather.humidity}%
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="size-3 text-primary" />{weather.wind} km/h
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 ml-2">
              <span className="text-5xl leading-none">{weather.icon}</span>
              <button onClick={onWeatherSearch} className="text-[10px] text-primary/70 hover:text-primary transition-colors font-medium">
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between animate-pulse">
            <div className="space-y-1.5">
              <div className="h-9 w-24 rounded-xl bg-border/50" />
              <div className="h-2.5 w-32 rounded bg-border/50" />
            </div>
            <Wind className="size-10 text-primary/15" />
          </div>
        )}
      </div>

      {/* ── App grid ── */}
      <div className="mx-4 mb-3 grid grid-cols-4 gap-x-1 gap-y-3 shrink-0">
        {APPS.map(app => (
          <button
            key={app.label}
            onClick={() => app.url ? window.open(app.url, "_blank") : undefined}
            className="flex flex-col items-center gap-1 group"
          >
            <span
              className="flex size-[52px] items-center justify-center rounded-[18px] text-white shadow group-active:scale-90 transition-transform duration-100"
              style={{ background: app.bg }}
            >
              {app.icon}
            </span>
            <span className="text-[9.5px] font-medium text-foreground/75">{app.label}</span>
          </button>
        ))}
      </div>

      {/* ── LEX Suggestions ── */}
      <div className="mx-4 flex-1 min-h-0 rounded-2xl border border-border/60 bg-popover/80 backdrop-blur overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-border/40">
          <Image src="/lex-orb.png" alt="LEX" width={18} height={18} className="rounded-full" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Ask LEX</span>
        </div>
        <div className="overflow-y-auto h-full pb-1">
          {SUGGESTIONS.map(s => (
            <button
              key={s.text}
              onClick={() => sendMessage(s.text)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent/50 active:bg-accent border-b border-border/20 last:border-0"
            >
              <span className="text-base leading-none shrink-0">{s.icon}</span>
              <span className="text-[13px] text-foreground">{s.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-2 shrink-0" />
    </div>
  )
}
