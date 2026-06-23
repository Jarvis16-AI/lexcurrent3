"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, Brain, RefreshCw, X } from "lucide-react"
import type { AppShared, Memory } from "./types"
import { cn } from "@/lib/utils"

const CATEGORIES = [
  { key: "personal",      label: "Personal",      color: "#3b82f6" },
  { key: "interests",     label: "Interests",     color: "#22c55e" },
  { key: "relationships", label: "Relationships", color: "#a855f7" },
  { key: "habits",        label: "Habits",        color: "#f97316" },
  { key: "emotions",      label: "Emotions",      color: "#ec4899" },
  { key: "knowledge",     label: "Knowledge",     color: "#eab308" },
  { key: "goals",         label: "Goals",         color: "#ef4444" },
  { key: "preferences",   label: "Preferences",   color: "#06b6d4" },
]

function getCat(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? { key, label: key, color: "#6b7280" }
}

/* ── sphere geometry ─────────────────────────────────────────── */
const SVG_W = 320
const SVG_H = 320
const CX = SVG_W / 2
const CY = SVG_H / 2
const SPHERE_R = 120

interface NodeData {
  x: number
  y: number
  z: number
  scale: number
  opacity: number
  r: number
  memory: Memory
}

function projectNodes(memories: Memory[], rotY: number): NodeData[] {
  const n = memories.length
  if (!n) return []

  return memories.map((m, i) => {
    const phi   = Math.acos(1 - 2 * (i + 0.5) / n)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i + rotY

    const x3 = Math.sin(phi) * Math.cos(theta)
    const y3 = Math.sin(phi) * Math.sin(theta)
    const z3 = Math.cos(phi)

    const p     = 2.8
    const s     = p / (p - z3 * 0.8)
    const depth = (z3 + 1) / 2

    return {
      x: CX + x3 * SPHERE_R * s,
      y: CY + y3 * SPHERE_R * s,
      z: z3,
      scale: s,
      opacity: 0.35 + depth * 0.65,
      r: 4 + m.confidence * 5 * s * 0.7,
      memory: m,
    }
  }).sort((a, b) => a.z - b.z)
}

/* ── Bottom sheet for selected memory ───────────────────────── */
function MemorySheet({ node, onClose, onDelete }: {
  node: NodeData
  onClose: () => void
  onDelete: (id: number) => void
}) {
  const cat = getCat(node.memory.category)
  return (
    <div
      className="absolute inset-0 z-20 flex items-end"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl border border-border/60 bg-card p-5 pb-7 shadow-2xl animate-in slide-in-from-bottom duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span
            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ background: cat.color + "25", color: cat.color }}
          >
            {cat.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {Math.round(node.memory.confidence * 100)}% confidence
            </span>
            <button
              onClick={() => { onDelete(node.memory.id); onClose() }}
              className="text-muted-foreground/60 hover:text-destructive transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{node.memory.content}</p>
        <p className="mt-3 text-[10px] text-muted-foreground">
          {new Date(node.memory.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   SPHERE VIEW
   ════════════════════════════════════════════════════════════════ */
function SphereCanvas({ nodes, onNodeClick }: {
  nodes: NodeData[]
  onNodeClick: (node: NodeData) => void
}) {
  const id = `sphere-glow-${Math.random().toString(36).slice(2, 7)}`

  /* connections between same-category nodes */
  const edges: { x1: number; y1: number; x2: number; y2: number; color: string; opacity: number }[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].memory.category === nodes[j].memory.category) {
        const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y)
        if (dist < 90) {
          edges.push({
            x1: nodes[i].x, y1: nodes[i].y,
            x2: nodes[j].x, y2: nodes[j].y,
            color: getCat(nodes[i].memory.category).color,
            opacity: Math.min(nodes[i].opacity, nodes[j].opacity) * 0.35,
          })
        }
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full"
      style={{ maxWidth: SVG_W, margin: "0 auto", display: "block" }}
    >
      <defs>
        <radialGradient id={id} cx="50%" cy="42%" r="52%">
          <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#0f172a" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#020617" stopOpacity="1" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="var(--color-primary, #d97706)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sphere background */}
      <circle cx={CX} cy={CY} r={SPHERE_R + 6} fill={`url(#${id})`} />
      <circle cx={CX} cy={CY} r={SPHERE_R + 6} fill={`url(#${id}-glow)`} />

      {/* subtle latitude rings */}
      {[-60, -30, 0, 30, 60].map(deg => {
        const rad = (deg * Math.PI) / 180
        const ry  = Math.cos(rad) * SPHERE_R
        const rx  = Math.sin(Math.abs(rad)) * SPHERE_R
        return (
          <ellipse
            key={deg}
            cx={CX} cy={CY}
            rx={rx} ry={3}
            fill="none"
            stroke="white"
            strokeOpacity={0.04}
            strokeWidth={0.8}
            transform={`translate(0, ${ry})`}
          />
        )
      })}

      {/* sphere border */}
      <circle cx={CX} cy={CY} r={SPHERE_R + 6} fill="none" stroke="white" strokeOpacity={0.08} strokeWidth={1} />

      {/* edge lines */}
      {edges.map((e, i) => (
        <line
          key={i}
          x1={e.x1} y1={e.y1}
          x2={e.x2} y2={e.y2}
          stroke={e.color}
          strokeOpacity={e.opacity}
          strokeWidth={0.8}
        />
      ))}

      {/* memory nodes */}
      {nodes.map(nd => {
        const cat = getCat(nd.memory.category)
        const inside = Math.hypot(nd.x - CX, nd.y - CY) < SPHERE_R + 4
        if (!inside) return null
        return (
          <g key={nd.memory.id} style={{ cursor: "pointer" }} onClick={() => onNodeClick(nd)}>
            <circle
              cx={nd.x} cy={nd.y}
              r={nd.r + 3}
              fill={cat.color}
              opacity={0.12 * nd.opacity}
            />
            <circle
              cx={nd.x} cy={nd.y}
              r={nd.r}
              fill={cat.color}
              opacity={nd.opacity}
            />
          </g>
        )
      })}

      {/* centre glow */}
      <circle cx={CX} cy={CY} r={8} fill="white" opacity={0.04} />
    </svg>
  )
}

/* ════════════════════════════════════════════════════════════════
   SCREEN
   ════════════════════════════════════════════════════════════════ */
export function MemoryTreeScreen({ goBack, time }: AppShared) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<NodeData | null>(null)
  const [rotY,     setRotY]     = useState(0)
  const rafRef                  = useRef<number | undefined>(undefined)
  const lastRef                 = useRef<number>(0)

  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""

  /* spinning animation */
  useEffect(() => {
    const animate = (t: number) => {
      const dt  = lastRef.current ? t - lastRef.current : 16
      lastRef.current = t
      setRotY(r => r + (dt / 1000) * 0.25)
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const fetchMemories = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/memory?userId=local")
      const data = await res.json()
      setMemories(data.memories ?? [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMemories() }, [fetchMemories])

  const handleDelete = async (id: number) => {
    setMemories(prev => prev.filter(m => m.id !== id))
    await fetch(`/api/memory?id=${id}&userId=local`, { method: "DELETE" })
  }

  const nodes = projectNodes(memories, rotY)

  /* category legend — only ones with data */
  const usedCats = CATEGORIES.filter(c => memories.some(m => m.category === c.key))

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">

      {/* status bar */}
      <div className="flex items-center justify-between px-6 pt-4 shrink-0 text-foreground">
        <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
        <span className="text-[11px] font-semibold text-primary">Memory</span>
      </div>

      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-2 shrink-0">
        <button
          onClick={goBack}
          className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Memory Sphere</h1>
          <p className="text-[11px] text-muted-foreground">
            {loading ? "Loading…" : `${memories.length} things LEX knows about you`}
          </p>
        </div>
        <button
          onClick={fetchMemories}
          className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* sphere or empty state */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Brain className="size-10 text-primary/40 animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading memory sphere…</p>
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-center px-8">
            <Brain className="size-14 text-muted-foreground/20" />
            <p className="text-sm font-semibold text-foreground">Sphere is empty</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Start chatting with LEX — every conversation automatically adds nodes to your memory sphere.
            </p>
          </div>
        ) : (
          <div className="w-full" style={{ maxWidth: SVG_W }}>
            <SphereCanvas nodes={nodes} onNodeClick={setSelected} />
          </div>
        )}
      </div>

      {/* category legend */}
      {usedCats.length > 0 && (
        <div className="px-5 pb-4 shrink-0">
          <div className="flex flex-wrap gap-2 justify-center">
            {usedCats.map(c => {
              const count = memories.filter(m => m.category === c.key).length
              return (
                <div
                  key={c.key}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{ background: c.color + "18", border: `1px solid ${c.color}40` }}
                >
                  <div className="size-2 rounded-full shrink-0" style={{ background: c.color }} />
                  <span className="text-[10px] font-medium" style={{ color: c.color }}>
                    {c.label} · {count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* selected memory sheet */}
      {selected && (
        <MemorySheet
          node={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
