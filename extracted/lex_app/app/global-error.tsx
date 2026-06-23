"use client"

import { AlertTriangle, RefreshCw } from "lucide-react"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    /* Log to console and attempt to send to /api/errors */
    console.error("[Global Error]", error)
    fetch("/api/errors", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        level:   "error",
        message: error.message,
        stack:   error.stack?.slice(0, 2000),
        context: "GlobalError",
        extra:   { digest: error.digest },
      }),
    }).catch(() => {})
  }, [error])

  return (
    <html lang="en" className="dark bg-zinc-950">
      <body className="font-sans antialiased flex min-h-screen items-center justify-center p-6">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm">

          <div className="flex size-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="size-8 text-red-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">LEX ran into a problem</h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Something unexpected happened at the app level. We&apos;ve noted the issue — tap below to reload.
            </p>
            {error.digest && (
              <p className="text-[10px] text-zinc-600 font-mono">ref: {error.digest}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={reset}
              className="flex items-center justify-center gap-2 rounded-full bg-white text-black font-semibold py-3 text-sm hover:bg-zinc-100 active:scale-95 transition-all"
            >
              <RefreshCw className="size-4" />
              Try again
            </button>
            <button
              onClick={() => window.location.href = "/"}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors py-2"
            >
              Return to home
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
