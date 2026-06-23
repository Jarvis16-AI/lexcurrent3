"use client"

import React from "react"
import { AlertTriangle, RefreshCw, ChevronDown } from "lucide-react"
import { logError } from "@/lib/error-logger"

interface Props {
  children:  React.ReactNode
  fallback?: React.ReactNode
  context?:  string
}

interface State {
  error:    Error | null
  info:     React.ErrorInfo | null
  expanded: boolean
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null, expanded: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info })
    logError(error, {
      context:      this.props.context ?? "ErrorBoundary",
      componentStack: info.componentStack ?? "",
    })
  }

  reset = () => this.setState({ error: null, info: null, expanded: false })

  render() {
    const { error, info, expanded } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="size-7 text-destructive" />
        </div>

        <div className="space-y-1">
          <p className="text-base font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            LEX hit an unexpected error. Your data is safe — tap below to try again.
          </p>
        </div>

        <button
          onClick={this.reset}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md active:scale-95 transition-transform"
        >
          <RefreshCw className="size-4" />
          Try again
        </button>

        {/* Collapsible technical detail (dev-friendly) */}
        <button
          onClick={() => this.setState(s => ({ expanded: !s.expanded }))}
          className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <ChevronDown className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide" : "Show"} details
        </button>

        {expanded && (
          <pre className="w-full max-w-sm rounded-xl bg-muted/50 border border-border/60 p-3 text-[10px] text-left text-muted-foreground overflow-auto max-h-32 whitespace-pre-wrap break-words">
            {error.message}
            {info?.componentStack?.slice(0, 400)}
          </pre>
        )}
      </div>
    )
  }
}

/* ── Convenience wrapper that applies to a specific section ── */
export function SafeSection({
  children, label, className,
}: {
  children:  React.ReactNode
  label?:    string
  className?: string
}) {
  return (
    <ErrorBoundary context={label ?? "SafeSection"}>
      <div className={className}>{children}</div>
    </ErrorBoundary>
  )
}
