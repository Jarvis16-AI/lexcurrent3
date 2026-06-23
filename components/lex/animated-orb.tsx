"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "acting"

const STATE_TIME: Record<OrbState, string> = {
  idle:      "2s",
  listening: "0.65s",
  thinking:  "1.3s",
  speaking:  "0.9s",
  acting:    "0.5s",
}

const STATE_CLASS: Record<OrbState, string> = {
  idle:      "orb-idle",
  listening: "orb-listen",
  thinking:  "orb-think",
  speaking:  "orb-speak",
  acting:    "orb-act",
}

interface AnimatedOrbProps {
  className?: string
  state?: OrbState
  showRing?: boolean
  size?: number
}

export function AnimatedOrb({
  className,
  state = "idle",
  showRing = false,
  size = 100,
}: AnimatedOrbProps) {
  const raw      = useId().replace(/:/g, "")
  const clipId   = `lc-${raw}`
  const filterId = `lf-${raw}`
  const gooId    = `lg-${raw}`

  const t = `calc(${STATE_TIME[state]} * var(--orb-speed-mult, 1))`

  return (
    <div
      className={cn("lex-orb", STATE_CLASS[state], className)}
      aria-hidden="true"
      style={{
        "--time-animation": t,
        width:  size,
        height: size,
      } as React.CSSProperties}
    >
      {showRing && <div className="lex-orb-ring" />}

      <div
        className="lex-orb-box"
        style={{ mask: `url(#${gooId})`, WebkitMask: `url(#${gooId})` }}
      />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="lex-orb-svg"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="50" cy="50" r="50" />
          </clipPath>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 15 -7"
            />
          </filter>
        </defs>
        <g id={gooId} clipPath={`url(#${clipId})`} filter={`url(#${filterId})`}>
          <polygon className="lex-orb-p1" points="50,15 85,80 15,80" />
          <polygon className="lex-orb-p2" points="50,10 90,75 10,75" />
          <polygon className="lex-orb-p3" points="20,20 80,20 80,80 20,80" />
          <polygon className="lex-orb-p4" points="50,5 95,80 5,80" />
          <polygon className="lex-orb-p5" points="50,20 80,70 20,70" />
          <polygon className="lex-orb-p6" points="25,15 75,15 75,85 25,85" />
          <polygon className="lex-orb-p7" points="50,25 85,75 15,75" />
        </g>
      </svg>
    </div>
  )
}
