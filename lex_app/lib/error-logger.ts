"use client"

/* ── Structured frontend error logger ───────────────────────────────
 * Sends errors to /api/errors (stored in DB + console).
 * Also integrates with Sentry if NEXT_PUBLIC_SENTRY_DSN is set.
 * ─────────────────────────────────────────────────────────────────── */

export interface ErrorContext {
  context?:         string
  url?:             string
  userId?:          string
  componentStack?:  string
  extra?:           Record<string, unknown>
}

let _sentryLoaded = false

async function getSentry() {
  if (_sentryLoaded) return null
  if (typeof window === "undefined") return null
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return null
  try {
    /* Use Function constructor to avoid compile-time module resolution */
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const load = new Function('return import("@sentry/nextjs")')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry: any = await load()
    if (typeof Sentry?.init === "function" && !Sentry.getClient?.()) {
      Sentry.init({ dsn, tracesSampleRate: 0.2, environment: process.env.NODE_ENV })
    }
    _sentryLoaded = true
    return Sentry
  } catch { return null /* sentry not installed — graceful no-op */ }
}

export async function logError(
  error:   Error | unknown,
  context: ErrorContext = {}
) {
  const err   = error instanceof Error ? error : new Error(String(error))
  const entry = {
    message:  err.message,
    stack:    err.stack?.slice(0, 2000),
    context:  context.context,
    url:      context.url ?? (typeof window !== "undefined" ? window.location.href : ""),
    userId:   context.userId,
    componentStack: context.componentStack?.slice(0, 1000),
    extra:    context.extra,
    ts:       Date.now(),
  }

  console.error("[LEX Error]", entry)

  /* Non-blocking send to backend */
  if (typeof window !== "undefined") {
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ level: "error", ...entry }),
    }).catch(() => {})

    /* Also send to Sentry if configured */
    getSentry().then(Sentry => {
      Sentry?.captureException(err, {
        extra: { ...context.extra, componentStack: context.componentStack },
      })
    }).catch(() => {})
  }
}

export function logWarn(message: string, extra?: Record<string, unknown>) {
  console.warn("[LEX Warn]", message, extra)
  if (typeof window !== "undefined") {
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ level: "warn", message, extra, ts: Date.now() }),
    }).catch(() => {})
  }
}

export function logInfo(message: string, extra?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") console.info("[LEX]", message, extra)
}

/* ── Global uncaught error handler (call once in root layout) ─────── */
export function installGlobalErrorHandlers() {
  if (typeof window === "undefined") return

  window.onerror = (msg, src, line, col, err) => {
    logError(err ?? new Error(String(msg)), {
      context: "window.onerror",
      extra:   { src, line, col },
    })
  }

  window.onunhandledrejection = (e: PromiseRejectionEvent) => {
    logError(e.reason instanceof Error ? e.reason : new Error(String(e.reason)), {
      context: "unhandledrejection",
    })
  }
}
