"use client"

import { useRef, useState, useCallback } from "react"
import { cn } from "@/lib/utils"

/* 3×3 dot layout in 240×240 SVG space */
const DOT_XY: [number, number][] = [
  [60,60],[120,60],[180,60],
  [60,120],[120,120],[180,120],
  [60,180],[120,180],[180,180],
]
const HIT  = 28
const NEED = 4

interface PatternLockProps {
  mode: "setup" | "confirm" | "verify"
  onComplete: (pattern: string) => void
  label?: string
  error?: string
}

export function PatternLock({ mode, onComplete, label, error }: PatternLockProps) {
  const svgRef   = useRef<SVGSVGElement>(null)
  const [seq,    setSeq]    = useState<number[]>([])
  const [cursor, setCursor] = useState<[number,number] | null>(null)
  const [active, setActive] = useState(false)

  const toSvgCoords = useCallback((ex: number, ey: number): [number, number] => {
    if (!svgRef.current) return [0,0]
    const r = svgRef.current.getBoundingClientRect()
    return [
      (ex - r.left)  / r.width  * 240,
      (ey - r.top)   / r.height * 240,
    ]
  }, [])

  const hitTest = useCallback((sx: number, sy: number, current: number[]) => {
    for (let i = 0; i < 9; i++) {
      if (current.includes(i)) continue
      const [dx, dy] = DOT_XY[i]
      if (Math.hypot(sx - dx, sy - dy) < HIT) return i
    }
    return -1
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    svgRef.current?.setPointerCapture(e.pointerId)
    const [sx, sy] = toSvgCoords(e.clientX, e.clientY)
    setCursor([sx, sy])
    setActive(true)
    const hit = hitTest(sx, sy, [])
    setSeq(hit >= 0 ? [hit] : [])
  }, [toSvgCoords, hitTest])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!active) return
    const [sx, sy] = toSvgCoords(e.clientX, e.clientY)
    setCursor([sx, sy])
    setSeq(prev => {
      const hit = hitTest(sx, sy, prev)
      return hit >= 0 ? [...prev, hit] : prev
    })
  }, [active, toSvgCoords, hitTest])

  const onPointerUp = useCallback(() => {
    setActive(false)
    setCursor(null)
    const current = seq
    if (current.length >= NEED) {
      onComplete(current.join("-"))
    }
    setTimeout(() => setSeq([]), current.length >= NEED ? 400 : 0)
  }, [seq, onComplete])

  /* build SVG lines */
  const lines: JSX.Element[] = []
  for (let i = 1; i < seq.length; i++) {
    const [ax, ay] = DOT_XY[seq[i-1]]
    const [bx, by] = DOT_XY[seq[i]]
    lines.push(
      <line key={`l${i}`} x1={ax} y1={ay} x2={bx} y2={by}
        stroke="var(--primary)" strokeWidth="3" strokeLinecap="round"
        opacity="0.7"
      />
    )
  }
  if (active && cursor && seq.length > 0) {
    const [lx, ly] = DOT_XY[seq[seq.length-1]]
    lines.push(
      <line key="live" x1={lx} y1={ly} x2={cursor[0]} y2={cursor[1]}
        stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"
        opacity="0.4" strokeDasharray="4 4"
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          {label ?? (
            mode === "setup"   ? "Draw your pattern (connect 4+ dots)" :
            mode === "confirm" ? "Draw pattern again to confirm" :
            "Draw your pattern to unlock"
          )}
        </p>
        {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
        {!error && seq.length > 0 && seq.length < NEED && (
          <p className="mt-1 text-[11px] text-muted-foreground">{seq.length} / {NEED} dots</p>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 240 240"
        className="w-52 h-52 touch-none cursor-crosshair"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* connection lines */}
        {lines}

        {/* dots */}
        {DOT_XY.map(([x, y], i) => {
          const selected = seq.includes(i)
          const isLast   = seq[seq.length-1] === i
          return (
            <g key={i}>
              {selected && (
                <circle cx={x} cy={y} r={20} fill="var(--primary)" opacity="0.12" />
              )}
              <circle
                cx={x} cy={y} r={selected ? 10 : 8}
                fill={selected ? "var(--primary)" : "transparent"}
                stroke={selected ? "var(--primary)" : "var(--muted-foreground)"}
                strokeWidth="2"
                opacity={selected ? 1 : 0.5}
                className="transition-all duration-100"
              />
              {isLast && (
                <circle cx={x} cy={y} r={4} fill="white" />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
