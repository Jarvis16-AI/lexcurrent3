"use client"

import Image from "next/image"
import { MicOff } from "lucide-react"
import type { AppShared } from "./types"

function Waveform() {
  return (
    <div className="flex items-end justify-center gap-[3px] h-10">
      {Array.from({ length: 36 }).map((_, i) => {
        const h = 4 + Math.abs(Math.sin(i * 0.85)) * 28
        return (
          <span
            key={i}
            className="w-[3px] rounded-full bg-primary/70 animate-pulse"
            style={{ height: `${h}px`, animationDelay: `${i * 30}ms` }}
          />
        )
      })}
    </div>
  )
}

export function VoiceScreen({ stopVoice, time }: AppShared) {
  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""

  return (
    <div className="flex h-full flex-col items-center">
      {/* status */}
      <div className="flex w-full items-center justify-between px-6 pt-4 text-foreground">
        <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
        <span className="text-[11px] font-semibold text-primary">LEX AI</span>
      </div>

      {/* content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-0 pb-12">
        {/* orb with animated rings */}
        <div className="relative flex items-center justify-center">
          <span className="absolute size-56 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
          <span className="absolute size-44 rounded-full border border-primary/15 animate-ping" style={{ animationDuration: "1.6s", animationDelay: "200ms" }} />
          <span className="absolute size-36 rounded-full border border-primary/20 animate-ping" style={{ animationDuration: "1.2s", animationDelay: "100ms" }} />
          <Image
            src="/lex-orb.png"
            alt="LEX listening"
            width={112}
            height={112}
            className="relative z-10 rounded-full shadow-2xl"
            priority
          />
        </div>

        <div className="mt-12 text-center">
          <p className="text-2xl font-bold text-primary animate-pulse">Listening…</p>
          <p className="mt-2 text-sm text-muted-foreground">Speak now</p>
        </div>

        <div className="mt-8 w-72">
          <Waveform />
        </div>

        <button
          onClick={stopVoice}
          className="mt-10 flex size-20 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl active:scale-90 transition-transform duration-150"
          aria-label="Stop recording"
        >
          <MicOff className="size-8" />
        </button>
        <p className="mt-3 text-xs text-muted-foreground">Tap to stop</p>
      </div>
    </div>
  )
}
