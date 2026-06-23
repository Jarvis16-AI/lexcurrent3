"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

/**
 * Animated metaball "lava" orb (adapted from Uiverse / andrew-manzyk).
 * Fully self-contained inside an SVG viewBox so it scales to any container
 * size — sizing is controlled via `className` (e.g. `size-24`).
 * Each instance gets unique gradient/mask ids so multiple orbs are independent.
 */
export function AnimatedOrb({ className }: { className?: string }) {
  const raw = useId().replace(/:/g, "")
  const maskId = `orb-mask-${raw}`
  const gradId = `orb-grad-${raw}`
  const rimId = `orb-rim-${raw}`
  const clipId = `orb-clip-${raw}`

  return (
    <div className={cn("lex-orb", className)} aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id={rimId} cx="50%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffd98a" />
            <stop offset="60%" stopColor="#ffbf48" />
            <stop offset="100%" stopColor="#bf4a1d" />
          </radialGradient>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="30%" stopColor="#ffbf48" />
            <stop offset="100%" stopColor="#be4a1d" />
          </linearGradient>
          <clipPath id={clipId}>
            <circle cx="50" cy="50" r="49" />
          </clipPath>
          <mask id={maskId}>
            <rect width="100" height="100" fill="black" />
            <g className="lex-orb__clip" fill="white">
              <polygon points="30,18 72,14 78,54 36,62" />
              <polygon points="18,40 60,33 66,76 24,82" />
              <polygon points="40,28 82,40 70,72 45,66" />
              <polygon points="24,46 56,50 50,82 30,76" />
              <polygon points="46,24 78,36 66,62 50,56" />
              <polygon points="34,40 66,46 60,72 40,66" />
              <polygon points="48,34 72,50 56,66 44,56" />
            </g>
          </mask>
        </defs>

        {/* everything stays inside the sphere */}
        <g clipPath={`url(#${clipId})`}>
          {/* base sphere with rim shading */}
          <circle cx="50" cy="50" r="49" fill={`url(#${rimId})`} />
          {/* morphing metaball core */}
          <rect width="100" height="100" fill={`url(#${gradId})`} mask={`url(#${maskId})`} />
        </g>
      </svg>
    </div>
  )
}
