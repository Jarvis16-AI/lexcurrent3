import { cn } from "@/lib/utils"

interface ProgressProps {
  value:     number
  max?:      number
  label?:    string
  sublabel?: string
  className?: string
  color?:    "primary" | "emerald" | "amber" | "red"
  size?:     "sm" | "md"
  animated?: boolean
}

const TRACK_COLORS = {
  primary: "bg-primary",
  emerald: "bg-emerald-500",
  amber:   "bg-amber-500",
  red:     "bg-red-500",
}

export function Progress({
  value, max = 100, label, sublabel, className, color = "primary", size = "md", animated = true,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {(label || sublabel) && (
        <div className="flex items-center justify-between">
          {label    && <span className="text-xs font-medium text-foreground">{label}</span>}
          {sublabel && <span className="text-[10px] text-muted-foreground">{sublabel}</span>}
        </div>
      )}
      <div className={cn(
        "w-full overflow-hidden rounded-full bg-muted/50",
        size === "sm" ? "h-1" : "h-2",
      )}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            TRACK_COLORS[color],
            animated && pct < 100 && "animate-pulse",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ── Chunked upload progress ─────────────────────────────────────── */
interface ChunkProgressProps {
  stage:    "reading" | "processing" | "uploading" | "analyzing" | "done" | "error"
  progress: number
  filename: string
}

const STAGE_LABELS: Record<ChunkProgressProps["stage"], string> = {
  reading:    "Reading file…",
  processing: "Processing…",
  uploading:  "Uploading…",
  analyzing:  "Analyzing with LEX…",
  done:       "Complete",
  error:      "Failed",
}

const STAGE_COLORS: Record<ChunkProgressProps["stage"], ProgressProps["color"]> = {
  reading:    "primary",
  processing: "primary",
  uploading:  "amber",
  analyzing:  "primary",
  done:       "emerald",
  error:      "red",
}

export function ChunkProgress({ stage, progress, filename }: ChunkProgressProps) {
  return (
    <div className="mx-4 mb-2 rounded-2xl border border-border/60 bg-card px-4 py-3 space-y-2 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{filename}</p>
        <span className={cn(
          "text-[10px] font-semibold",
          stage === "done"  ? "text-emerald-400" :
          stage === "error" ? "text-red-400"     : "text-muted-foreground"
        )}>
          {STAGE_LABELS[stage]}
        </span>
      </div>
      <Progress
        value={progress}
        color={STAGE_COLORS[stage]}
        size="sm"
        animated={stage !== "done" && stage !== "error"}
      />
    </div>
  )
}
