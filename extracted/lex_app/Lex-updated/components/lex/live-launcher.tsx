"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import {
  Mic, MicOff, Send, ChevronLeft, Search, Phone, Map, MessageCircle,
  Camera, Music, PlayCircle, Mail, Navigation, Grid2x2, User,
  ScanLine, Folder, Sun, Wind, Droplets, Loader2, X,
} from "lucide-react"
import { PhoneFrame, StatusBar, HomeIndicator, GlassCard } from "./primitives"
import { AnimatedOrb } from "./animated-orb"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Weather {
  temp: number; feelsLike: number; humidity: number; wind: number
  label: string; icon: string; high: number; low: number; city: string; unit: string
}
interface Msg { role: "user" | "assistant"; content: string }

/* ------------------------------------------------------------------ */
/*  Static data                                                          */
/* ------------------------------------------------------------------ */
const APPS = [
  { label: "Phone",    bg: "#34c759", icon: <Phone     className="size-5" />, url: "tel:"                        },
  { label: "Maps",     bg: "#4a90e2", icon: <Map       className="size-5" />, url: "https://maps.google.com"     },
  { label: "Messages", bg: "#30d158", icon: <MessageCircle className="size-5" />, url: "sms:"                   },
  { label: "Camera",   bg: "#1c1c1e", icon: <Camera    className="size-5" />, url: null                          },
  { label: "Music",    bg: "#fa233b", icon: <Music     className="size-5" />, url: "https://open.spotify.com"    },
  { label: "YouTube",  bg: "#ff0000", icon: <PlayCircle className="size-5" />, url: "https://youtube.com"       },
  { label: "Gmail",    bg: "#ea4335", icon: <Mail      className="size-5" />, url: "https://gmail.com"           },
  { label: "WhatsApp", bg: "#25d366", icon: <MessageCircle className="size-5" />, url: "https://web.whatsapp.com" },
]

const SUGGESTIONS = [
  { text: "What's the weather today?",     icon: <Sun       className="size-3" /> },
  { text: "Navigate to the nearest cafe",  icon: <Navigation className="size-3" /> },
  { text: "What can you help me with?",    icon: <Search    className="size-3" /> },
  { text: "Set a reminder for tomorrow",   icon: <MessageCircle className="size-3" /> },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */
function Waveform() {
  return (
    <div className="flex items-end justify-center gap-[2px] h-8">
      {Array.from({ length: 30 }).map((_, i) => {
        const h = 4 + Math.abs(Math.sin(i * 0.85)) * 22
        return (
          <span
            key={i}
            className="w-[2px] rounded-full bg-primary/70 animate-pulse"
            style={{ height: `${h}px`, animationDelay: `${i * 35}ms` }}
          />
        )
      })}
    </div>
  )
}

function ToolBtn({
  icon, label, onClick, active,
}: { icon: React.ReactNode; label: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-0.5 text-[8px]",
        active ? "text-red-500" : "text-muted-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                       */
/* ------------------------------------------------------------------ */
export function LiveLauncher() {
  type Screen = "home" | "lex" | "voice"
  const [screen, setScreen]           = useState<Screen>("home")
  const [weather, setWeather]         = useState<Weather | null>(null)
  const [time, setTime]               = useState(new Date())
  const [messages, setMessages]       = useState<Msg[]>([])
  const [input, setInput]             = useState("")
  const [thinking, setThinking]       = useState(false)
  const [recording, setRecording]     = useState(false)
  const [voiceStatus, setVoiceStatus] = useState("")

  const mediaRef      = useRef<MediaRecorder | null>(null)
  const chunksRef     = useRef<Blob[]>([])
  const messagesEnd   = useRef<HTMLDivElement>(null)

  /* Clock */
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  /* Weather — geolocation → Open-Meteo (proxied) */
  useEffect(() => {
    const load = (lat: number, lng: number) =>
      fetch(`/api/weather?lat=${lat}&lng=${lng}`)
        .then(r => r.json())
        .then(d => { if (!d.error) setWeather(d) })
        .catch(() => {})

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => load(p.coords.latitude, p.coords.longitude),
        () => { /* no fallback — wait for user to pick location */ },
      )
    }
  }, [])

  /* Scroll messages to bottom */
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, thinking])

  /* ---- Send message ---- */
  const sendMessage = useCallback(async (text: string) => {
    const clean = text.trim()
    if (!clean || thinking) return

    const userMsg: Msg = { role: "user", content: clean }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setThinking(true)
    setScreen("lex")

    try {
      const ctx = weather
        ? `User is in ${weather.city}. Currently ${weather.temp}${weather.unit}, ${weather.label}.`
        : undefined

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg], context: ctx }),
      })
      const data = await res.json()
      const reply: string = data.reply ?? "Sorry, I couldn't process that."
      setMessages(prev => [...prev, { role: "assistant", content: reply }])
      speakReply(reply)
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Connection hiccup — please try again." },
      ])
    } finally {
      setThinking(false)
    }
  }, [messages, thinking, weather])

  /* ---- ElevenLabs TTS ---- */
  const speakReply = async (text: string) => {
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 250) }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play().catch(() => {})
    } catch { /* voice optional */ }
  }

  /* ---- Voice recording → transcription → chat ---- */
  const toggleRecording = async () => {
    if (recording) {
      mediaRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr     = new MediaRecorder(stream)
      chunksRef.current = []

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setRecording(false)
        setScreen("lex")
        setVoiceStatus("Transcribing...")
        setThinking(true)

        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        const fd   = new FormData()
        fd.append("audio", blob, "voice.webm")

        try {
          const tres  = await fetch("/api/transcribe", { method: "POST", body: fd })
          const tdata = await tres.json()
          setVoiceStatus("")
          if (tdata.transcript?.trim()) {
            setThinking(false)
            await sendMessage(tdata.transcript)
          } else {
            setMessages(prev => [...prev, { role: "assistant", content: "I couldn't hear that clearly. Try again?" }])
            setThinking(false)
          }
        } catch {
          setVoiceStatus("")
          setThinking(false)
        }
      }

      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setScreen("voice")
    } catch {
      alert("Microphone access denied. Please allow mic access to use voice.")
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
  }

  /* ---- Formatting ---- */
  const fmtTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const fmtDate = (d: Date) => d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })

  /* ================================================================= */
  /*  SCREEN: HOME                                                       */
  /* ================================================================= */
  const HomeScreen = (
    <>
      <StatusBar />

      {/* Clock */}
      <div className="px-5 pt-2 text-center">
        <p className="text-5xl font-bold tabular-nums text-foreground leading-none">{fmtTime(time)}</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtDate(time)}</p>
      </div>

      {/* Weather card */}
      <div className="mx-5 mt-3 rounded-2xl bg-accent/60 px-4 py-3">
        {weather ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-foreground leading-none">
                {weather.temp}{weather.unit}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{weather.label}</p>
              <p className="text-[10px] text-muted-foreground">H {weather.high}° · L {weather.low}°</p>
              <p className="text-[9px] text-primary/80 font-medium mt-0.5">{weather.city}</p>
            </div>
            <div className="text-right">
              <span className="text-4xl leading-none">{weather.icon}</span>
              <div className="mt-1 flex gap-2 justify-end text-[9px] text-muted-foreground">
                <span className="flex items-center gap-0.5"><Droplets className="size-2.5" />{weather.humidity}%</span>
                <span className="flex items-center gap-0.5"><Wind className="size-2.5" />{weather.wind}km/h</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between animate-pulse">
            <div className="space-y-1.5">
              <div className="h-7 w-16 rounded-lg bg-border/60" />
              <div className="h-2.5 w-20 rounded bg-border/60" />
            </div>
            <Sun className="size-8 text-primary/30" />
          </div>
        )}
      </div>

      {/* App grid */}
      <div className="mt-3 grid grid-cols-4 gap-y-3 px-5">
        {APPS.map(app => (
          <button
            key={app.label}
            onClick={() => app.url ? window.open(app.url, "_blank") : undefined}
            className="flex flex-col items-center gap-1 group"
          >
            <span
              className="flex size-11 items-center justify-center rounded-2xl text-white shadow-sm group-active:scale-90 transition-transform duration-100"
              style={{ background: app.bg }}
            >
              {app.icon}
            </span>
            <span className="text-[9px] font-medium text-foreground/80">{app.label}</span>
          </button>
        ))}
      </div>

      {/* LEX suggestions */}
      <div className="mx-5 mt-3">
        <GlassCard className="p-3">
          <p className="mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Ask LEX</p>
          {SUGGESTIONS.map(s => (
            <button
              key={s.text}
              onClick={() => sendMessage(s.text)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-accent/50 active:bg-accent transition-colors"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {s.icon}
              </span>
              <span className="text-xs text-foreground">{s.text}</span>
            </button>
          ))}
        </GlassCard>
      </div>

      {/* NavDock */}
      <div className="mt-auto flex items-center justify-between px-7 pb-1 pt-1">
        <Grid2x2 className="size-5 text-primary" />
        <button
          onClick={() => setScreen("lex")}
          className="active:scale-90 transition-transform duration-100"
          aria-label="Open LEX"
        >
          <AnimatedOrb className="pointer-events-none size-10" />
        </button>
        <User className="size-5 text-muted-foreground" />
      </div>
      <HomeIndicator />
    </>
  )

  /* ================================================================= */
  /*  SCREEN: LEX CHAT                                                   */
  /* ================================================================= */
  const LexScreen = (
    <>
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2">
        <button
          onClick={() => setScreen("home")}
          className="flex items-center gap-0.5 text-muted-foreground active:text-primary transition-colors"
        >
          <ChevronLeft className="size-4" />
          <span className="text-[11px]">Home</span>
        </button>
        <span className="text-sm font-bold text-primary">LEX</span>
        <Search className="size-4 text-muted-foreground" />
      </div>

      {/* Empty state */}
      {messages.length === 0 && !thinking && (
        <div className="flex flex-col items-center mt-5">
          <Image
            src="/lex-orb.png"
            alt="LEX"
            width={72}
            height={72}
            className="rounded-full"
            priority
          />
          <p className="mt-2 text-sm font-semibold text-foreground">What would you like to do?</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Type below or tap 🎙 to speak</p>
        </div>
      )}

      {/* Messages */}
      {(messages.length > 0 || thinking) && (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-2" style={{ maxHeight: 280 }}>
          {messages.map((m, i) => (
            <div key={i} className={cn("flex items-end gap-1.5", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <Image src="/lex-orb.png" alt="LEX" width={16} height={16} className="rounded-full shrink-0 mb-0.5" />
              )}
              <div
                className={cn(
                  "rounded-2xl px-3 py-2 text-xs leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm max-w-[78%]"
                    : "bg-card border border-border text-foreground rounded-bl-sm max-w-[85%]",
                )}
              >
                {m.content}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex items-end gap-1.5">
              <Image src="/lex-orb.png" alt="LEX" width={16} height={16} className="rounded-full mb-0.5" />
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="size-1.5 rounded-full bg-primary/60 animate-bounce"
                    style={{ animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </div>
              {voiceStatus && (
                <span className="text-[9px] text-muted-foreground ml-1">{voiceStatus}</span>
              )}
            </div>
          )}
          <div ref={messagesEnd} />
        </div>
      )}

      {/* Clear chat */}
      {messages.length > 0 && (
        <div className="flex justify-end px-4 pb-1">
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary transition-colors"
          >
            <X className="size-2.5" /> Clear
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-1">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask LEX anything..."
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
          {input.trim() ? (
            <button
              onClick={() => sendMessage(input)}
              disabled={thinking}
              className="text-primary active:scale-90 transition-transform disabled:opacity-40"
            >
              {thinking ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          ) : (
            <button
              onClick={toggleRecording}
              className={cn("transition-colors", recording ? "text-red-500" : "text-primary")}
            >
              <Mic className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom tools */}
      <div className="flex items-center justify-around border-t border-border px-4 py-1.5">
        <ToolBtn icon={<Mic className="size-3.5" />} label="Voice" onClick={toggleRecording} active={recording} />
        <ToolBtn icon={<Camera className="size-3.5" />} label="Camera" />
        <button onClick={() => setScreen("home")} className="active:scale-90 transition-transform duration-100">
          <AnimatedOrb className="pointer-events-none size-9" />
        </button>
        <ToolBtn icon={<ScanLine className="size-3.5" />} label="Screen" />
        <ToolBtn icon={<Folder className="size-3.5" />} label="Files" />
      </div>
      <HomeIndicator />
    </>
  )

  /* ================================================================= */
  /*  SCREEN: VOICE RECORDING                                            */
  /* ================================================================= */
  const VoiceScreen = (
    <>
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-2">
        <button
          onClick={stopRecording}
          className="flex items-center gap-0.5 text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
          <span className="text-[11px]">Cancel</span>
        </button>
        <span className="text-sm font-bold text-primary">LEX</span>
        <div className="w-10" />
      </div>

      {/* Orb with pulse rings */}
      <div className="flex flex-col items-center mt-10">
        <div className="relative flex items-center justify-center">
          <div className="absolute size-32 rounded-full border border-primary/15 animate-ping" />
          <div className="absolute size-24 rounded-full border border-primary/25 animate-ping" style={{ animationDelay: "200ms" }} />
          <Image
            src="/lex-orb.png"
            alt="LEX listening"
            width={88}
            height={88}
            className="rounded-full relative z-10 shadow-lg"
            priority
          />
        </div>

        <p className="mt-7 text-xl font-bold text-primary animate-pulse">Listening…</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Speak now, tap stop when done</p>

        <div className="mt-5 w-full px-8">
          <Waveform />
        </div>

        {/* Stop button */}
        <button
          onClick={stopRecording}
          className="mt-8 flex size-16 items-center justify-center rounded-full bg-red-500 text-white shadow-xl active:scale-90 transition-transform"
        >
          <MicOff className="size-6" />
        </button>
        <p className="mt-2 text-[10px] text-muted-foreground">Tap to stop</p>
      </div>

      <HomeIndicator />
    </>
  )

  /* ================================================================= */
  /*  RENDER                                                             */
  /* ================================================================= */
  return (
    <PhoneFrame label="Live LEX" sublabel="Tap orb · chat · speak to LEX">
      {screen === "home"  && HomeScreen}
      {screen === "lex"   && LexScreen}
      {screen === "voice" && VoiceScreen}
    </PhoneFrame>
  )
}
