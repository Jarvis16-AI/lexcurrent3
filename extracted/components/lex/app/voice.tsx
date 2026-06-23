"use client"

import { MicOff } from "lucide-react"
import { AnimatedOrb } from "../animated-orb"
import type { AppShared } from "./types"

/* Animated waveform bars — heights driven by CSS keyframes */
function Waveform({ active }: { active: boolean }) {
  const bars = 36
  return (
    <div className="flex items-end justify-center gap-[2.5px] h-10">
      {Array.from({ length: bars }).map((_, i) => {
        const base  = 4 + Math.abs(Math.sin(i * 0.85)) * 12
        const delay = (i * 40) % 600
        return (
          <span
            key={i}
            className="rounded-full bg-primary/70 transition-all duration-300"
            style={{
              width: "2.5px",
              height: active ? undefined : `${base}px`,
              minHeight: active ? "4px" : undefined,
              animation: active
                ? `lex-waveform ${300 + (i % 5) * 80}ms ease-in-out ${delay}ms infinite alternate`
                : "none",
              ...(active ? { "--bar-h": `${base + 14}px` } as React.CSSProperties : {}),
            }}
          />
        )
      })}
    </div>
  )
}

/* Status label and subtitle for each state */
function statusText(recording: boolean, thinking: boolean, ttsPlaying: boolean) {
  if (ttsPlaying)  return { title: "Speaking…",   sub: "LEX is responding",   color: "text-green-400" }
  if (thinking)    return { title: "Thinking…",   sub: "Processing your words", color: "text-purple-400" }
  if (recording)   return { title: "Listening…",  sub: "Speak now",            color: "text-sky-400" }
  return             { title: "Ready",            sub: "Tap mic to speak",     color: "text-primary" }
}

export function VoiceScreen({ stopVoice, time, recording, thinking, ttsPlaying }: AppShared) {
  const fmt = time
    ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : ""

  const orbState = ttsPlaying ? "speaking" : thinking ? "thinking" : recording ? "listening" : "idle"
  const { title, sub, color } = statusText(recording, thinking, ttsPlaying)

  return (
    <div className="flex h-full flex-col items-center bg-transparent">
      {/* status bar */}
      <div className="flex w-full items-center justify-between px-6 pt-4 text-foreground shrink-0">
        <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
        <span className="text-[11px] font-semibold text-primary">LEX AI</span>
      </div>

      {/* main content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-0 pb-10">

        {/* orb with state-aware rings */}
        <div className="relative flex items-center justify-center">
          {/* outer pulse rings — color adapts to orb state */}
          <span
            className="absolute rounded-full animate-ping"
            style={{
              width: "224px", height: "224px",
              border: `1px solid ${orbState === "listening" ? "rgba(56,189,248,0.15)" : orbState === "thinking" ? "rgba(192,132,252,0.15)" : orbState === "speaking" ? "rgba(74,222,128,0.15)" : "rgba(249,115,22,0.12)"}`,
              animationDuration: "2.2s",
            }}
          />
          <span
            className="absolute rounded-full animate-ping"
            style={{
              width: "176px", height: "176px",
              border: `1px solid ${orbState === "listening" ? "rgba(56,189,248,0.22)" : orbState === "thinking" ? "rgba(192,132,252,0.22)" : orbState === "speaking" ? "rgba(74,222,128,0.22)" : "rgba(249,115,22,0.18)"}`,
              animationDuration: "1.6s",
              animationDelay: "200ms",
            }}
          />
          <span
            className="absolute rounded-full animate-ping"
            style={{
              width: "136px", height: "136px",
              border: `1px solid ${orbState === "listening" ? "rgba(56,189,248,0.30)" : orbState === "thinking" ? "rgba(192,132,252,0.30)" : orbState === "speaking" ? "rgba(74,222,128,0.30)" : "rgba(249,115,22,0.22)"}`,
              animationDuration: "1.1s",
              animationDelay: "100ms",
            }}
          />

          {/* animated orb — state-aware colors + speed */}
          <AnimatedOrb
            state={orbState}
            className="relative z-10 size-28 drop-shadow-2xl"
          />
        </div>

        {/* status */}
        <div className="mt-12 text-center px-6">
          <p className={`text-2xl font-bold ${color} transition-colors duration-500`}>
            {title}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
        </div>

        {/* waveform */}
        <div className="mt-8 w-72">
          <Waveform active={recording || ttsPlaying} />
        </div>

        {/* stop button */}
        <button
          onClick={stopVoice}
          className="mt-10 flex size-20 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl shadow-red-500/30 active:scale-90 transition-transform duration-150 hover:bg-red-600"
          aria-label="Stop recording"
        >
          <MicOff className="size-8" />
        </button>
        <p className="mt-3 text-xs text-muted-foreground">Tap to stop</p>
      </div>
    </div>
  )
}
