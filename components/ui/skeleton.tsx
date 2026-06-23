import { cn } from "@/lib/utils"

/* ── Base shimmer ─────────────────────────────────────────────────── */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted/60",
        className,
      )}
      {...props}
    />
  )
}

/* ── Message bubble skeleton ─────────────────────────────────────── */
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <Skeleton className="size-6 rounded-full shrink-0" />}
      <div className={cn("space-y-1.5 max-w-[70%]", isUser ? "items-end flex flex-col" : "")}>
        <Skeleton className={cn("h-4 rounded-full", isUser ? "w-32" : "w-48")} />
        <Skeleton className={cn("h-4 rounded-full", isUser ? "w-24" : "w-36")} />
        <Skeleton className={cn("h-4 rounded-full", isUser ? "w-16" : "w-28")} />
      </div>
    </div>
  )
}

/* ── Card skeleton ───────────────────────────────────────────────── */
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  )
}

/* ── Settings row skeleton ───────────────────────────────────────── */
export function SettingsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-3 py-3">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
          <Skeleton className="h-7 w-12 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/* ── List skeleton ───────────────────────────────────────────────── */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="size-9 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Inline text skeleton (replaces a single line) ───────────────── */
export function InlineSkeleton({ width = "w-24" }: { width?: string }) {
  return <Skeleton className={cn("inline-block h-3 rounded-full align-middle", width)} />
}
