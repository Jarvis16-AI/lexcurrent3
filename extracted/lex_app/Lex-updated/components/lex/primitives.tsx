import type { ReactNode } from "react"
import { Signal, Wifi, BatteryFull, Grid2x2, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedOrb } from "./animated-orb"

export { AnimatedOrb }

/* ---------------- Phone Frame ---------------- */

export function PhoneFrame({
  children,
  className,
  label,
  sublabel,
}: {
  children: ReactNode
  className?: string
  label?: string
  sublabel?: string
}) {
  return (
    <figure className="flex flex-col gap-3">
      {label ? (
        <figcaption className="px-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {sublabel ? <p className="text-xs text-muted-foreground">{sublabel}</p> : null}
        </figcaption>
      ) : null}
      <div
        className={cn(
          "relative aspect-[9/19.5] w-full overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm ring-1 ring-black/5",
          className,
        )}
      >
        <div className="flex h-full flex-col">{children}</div>
      </div>
    </figure>
  )
}

/* ---------------- Status Bar ---------------- */

export function StatusBar({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-between px-5 pt-3 text-foreground", className)}>
      <span className="text-[11px] font-semibold tabular-nums">9:41</span>
      <div className="flex items-center gap-1">
        <Signal className="size-3" />
        <Wifi className="size-3" />
        <BatteryFull className="size-3.5" />
      </div>
    </div>
  )
}

/* ---------------- Home Indicator ---------------- */

export function HomeIndicator() {
  return (
    <div className="flex justify-center pb-2 pt-1">
      <div className="h-1 w-28 rounded-full bg-foreground/30" />
    </div>
  )
}

/* ---------------- The Orb ---------------- */

export function Orb({ className }: { className?: string }) {
  return <AnimatedOrb className={cn("pointer-events-none select-none", className)} />
}

/* ---------------- Dock / Bottom Nav ---------------- */

export function NavDock({ active, showOrb }: { active?: "home" | "profile"; showOrb?: boolean }) {
  return (
    <div className="mt-auto flex items-center justify-between px-7 pb-1 pt-1">
      <Grid2x2 className={cn("size-5", active === "home" ? "text-primary" : "text-muted-foreground")} />
      {showOrb ? (
        <AnimatedOrb className="pointer-events-none select-none size-10" />
      ) : (
        <div className="size-10" />
      )}
      <User className={cn("size-5", active === "profile" ? "text-primary" : "text-muted-foreground")} />
    </div>
  )
}

/* ---------------- App Icon ---------------- */

export function AppIcon({
  label,
  bg,
  children,
  small,
}: {
  label?: string
  bg: string
  children: ReactNode
  small?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl text-white shadow-sm",
          small ? "size-11" : "size-14",
        )}
        style={{ background: bg }}
      >
        {children}
      </div>
      {label ? <span className="text-[10px] font-medium text-foreground/80">{label}</span> : null}
    </div>
  )
}

/* ---------------- Card ---------------- */

export function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border/70 bg-popover/80 p-4 shadow-sm backdrop-blur", className)}>
      {children}
    </div>
  )
}
