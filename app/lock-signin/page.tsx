export default function LockSignIn() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-stone-950 p-6">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-2xl text-center">
        <div className="mb-6">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-xl font-bold text-foreground">Google Sign-In</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            To enable Google recovery, add your{" "}
            <code className="rounded bg-accent px-1 text-xs">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="rounded bg-accent px-1 text-xs">GOOGLE_CLIENT_SECRET</code>{" "}
            environment secrets in Replit, then restart the app.
          </p>
        </div>
        <a
          href="/"
          className="inline-block rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Back to LEX
        </a>
      </div>
    </div>
  )
}
