/**
 * Sentry integration helper for LEX AI OS.
 *
 * To enable:
 *   1. Create a project at sentry.io
 *   2. Add NEXT_PUBLIC_SENTRY_DSN to Replit Secrets (client-side)
 *   3. Add SENTRY_DSN to Replit Secrets (server-side)
 *   4. Add SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN for source maps
 *
 * Without a DSN the helpers are safe no-ops — the app works normally.
 */

export const SENTRY_DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? ""

export const SENTRY_CONFIG = {
  dsn:              SENTRY_DSN,
  environment:      process.env.NODE_ENV ?? "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 0,
  debug:            false,
  enabled:          !!SENTRY_DSN,
}

/** Server-side error capture (safe no-op if Sentry not configured) */
export async function captureServerError(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  if (!SENTRY_DSN) {
    console.error("[Sentry/server] DSN not set — logging locally:", error, context)
    return
  }
  try {
    /* Use Function constructor to avoid compile-time module resolution */
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const load = new Function('return import("@sentry/nextjs")')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry: any = await load()
    Sentry?.captureException?.(error, { extra: context })
  } catch {
    console.error("[Sentry/server] capture failed:", error)
  }
}
