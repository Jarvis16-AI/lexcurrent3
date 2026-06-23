"use client"

import { useState } from "react"
import { Delete } from "lucide-react"
import { cn } from "@/lib/utils"

const DIGITS = ["1","2","3","4","5","6","7","8","9","","0","⌫"]

interface PinPadProps {
  mode: "setup" | "confirm" | "verify"
  length?: number
  onComplete: (pin: string) => void
  label?: string
  error?: string
}

export function PinPad({ mode, length = 4, onComplete, label, error }: PinPadProps) {
  const [entered, setEntered] = useState("")

  const push = (d: string) => {
    if (d === "⌫") { setEntered(p => p.slice(0, -1)); return }
    if (!d) return
    const next = entered + d
    setEntered(next)
    if (next.length >= length) {
      setTimeout(() => { onComplete(next); setEntered("") }, 180)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{label ?? (
          mode === "setup"   ? "Enter a PIN" :
          mode === "confirm" ? "Confirm your PIN" :
          "Enter PIN to unlock"
        )}</p>
        {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
      </div>

      {/* dots */}
      <div className="flex gap-4">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-3 rounded-full border-2 transition-all duration-150",
              i < entered.length
                ? "bg-primary border-primary scale-110"
                : "bg-transparent border-foreground/40",
            )}
          />
        ))}
      </div>

      {/* keypad */}
      <div className="grid grid-cols-3 gap-3 w-56">
        {DIGITS.map((d, i) => (
          <button
            key={i}
            onClick={() => push(d)}
            disabled={!d && d !== "0"}
            className={cn(
              "flex items-center justify-center h-14 rounded-full text-xl font-semibold transition-all duration-100 select-none",
              d === "⌫"
                ? "text-muted-foreground hover:text-foreground active:bg-accent/60"
                : d
                ? "bg-accent/50 text-foreground hover:bg-accent active:scale-90 active:bg-accent/80 shadow-sm"
                : "pointer-events-none",
            )}
          >
            {d === "⌫" ? <Delete className="size-5" /> : d}
          </button>
        ))}
      </div>
    </div>
  )
}
