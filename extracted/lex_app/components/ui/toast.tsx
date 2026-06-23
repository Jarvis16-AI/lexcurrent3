"use client"

import { createContext, useCallback, useContext, useState, useRef, useEffect } from "react"
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

/* ── Types ─────────────────────────────────────────────────────────── */
export type ToastVariant = "success" | "error" | "warning" | "info"

export interface Toast {
  id:       string
  message:  string
  variant:  ToastVariant
  duration: number
  detail?:  string
}

interface ToastContextValue {
  toast:   (message: string, opts?: { variant?: ToastVariant; detail?: string; duration?: number }) => void
  success: (message: string, detail?: string) => void
  error:   (message: string, detail?: string) => void
  warning: (message: string, detail?: string) => void
  info:    (message: string, detail?: string) => void
}

/* ── Context ───────────────────────────────────────────────────────── */
const ToastCtx = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx
}

/* ── Single toast item ─────────────────────────────────────────────── */
const ICONS: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />,
  error:   <XCircle      className="size-4 shrink-0 text-red-400"     />,
  warning: <AlertTriangle className="size-4 shrink-0 text-amber-400"  />,
  info:    <Info          className="size-4 shrink-0 text-blue-400"   />,
}

const BAR_COLORS: Record<ToastVariant, string> = {
  success: "bg-emerald-500",
  error:   "bg-red-500",
  warning: "bg-amber-500",
  info:    "bg-blue-500",
}

const BORDER_COLORS: Record<ToastVariant, string> = {
  success: "border-emerald-500/30",
  error:   "border-red-500/30",
  warning: "border-amber-500/30",
  info:    "border-blue-500/30",
}

function ToastItem({ t, onRemove }: { t: Toast; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    timerRef.current = setTimeout(() => dismiss(), t.duration)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismiss() {
    setLeaving(true)
    setTimeout(() => onRemove(t.id), 300)
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card/95 shadow-xl backdrop-blur-sm",
        "transition-all duration-300 ease-out w-[320px] max-w-[90vw]",
        BORDER_COLORS[t.variant],
        visible && !leaving
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-2 opacity-0 scale-95",
      )}
    >
      {/* progress bar */}
      <div
        className={cn("absolute bottom-0 left-0 h-0.5 rounded-full", BAR_COLORS[t.variant])}
        style={{
          width:     "100%",
          animation: `toast-shrink ${t.duration}ms linear forwards`,
        }}
      />

      <div className="flex items-start gap-3 px-4 py-3">
        <span className="mt-0.5">{ICONS[t.variant]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{t.message}</p>
          {t.detail && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.detail}</p>
          )}
        </div>
        <button
          onClick={dismiss}
          className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  )
}

/* ── Provider ──────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts(ts => ts.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((
    message:  string,
    opts?: { variant?: ToastVariant; detail?: string; duration?: number }
  ) => {
    const id: Toast = {
      id:       `toast-${Date.now()}-${Math.random()}`,
      message,
      variant:  opts?.variant  ?? "info",
      detail:   opts?.detail,
      duration: opts?.duration ?? 4000,
    }
    setToasts(ts => [...ts.slice(-4), id])
  }, [])

  const success = useCallback((message: string, detail?: string) =>
    toast(message, { variant: "success", detail }), [toast])
  const error   = useCallback((message: string, detail?: string) =>
    toast(message, { variant: "error",   detail, duration: 6000 }), [toast])
  const warning = useCallback((message: string, detail?: string) =>
    toast(message, { variant: "warning", detail }), [toast])
  const info    = useCallback((message: string, detail?: string) =>
    toast(message, { variant: "info",    detail }), [toast])

  return (
    <ToastCtx.Provider value={{ toast, success, error, warning, info }}>
      {children}

      {/* Portal-like fixed container */}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} onRemove={remove} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toast-shrink {
          from { width: 100% }
          to   { width: 0%   }
        }
      `}</style>
    </ToastCtx.Provider>
  )
}
