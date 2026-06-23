import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

interface ErrorEntry {
  level:    "error" | "warn" | "info"
  message:  string
  stack?:   string
  context?: string
  url?:     string
  userId?:  string
  componentStack?: string
  extra?:   Record<string, unknown>
  ts?:      number
}

/* ── Ensure table exists (idempotent) ─────────────────────────────── */
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS error_logs (
      id         SERIAL PRIMARY KEY,
      level      TEXT NOT NULL DEFAULT 'error',
      message    TEXT NOT NULL,
      stack      TEXT,
      context    TEXT,
      url        TEXT,
      user_id    TEXT,
      extra      JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

/* ── POST /api/errors — capture a frontend error ─────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as ErrorEntry

    const { level = "error", message, stack, context, url, userId, extra } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    /* Cap field lengths */
    const safe = {
      level:   ["error", "warn", "info"].includes(level) ? level : "error",
      message: message.slice(0, 2000),
      stack:   stack?.slice(0, 5000),
      context: context?.slice(0, 200),
      url:     url?.slice(0, 500),
      userId:  userId?.slice(0, 100),
      extra:   extra ? JSON.stringify(extra).slice(0, 2000) : null,
    }

    /* Always log to server console for easy Replit log browsing */
    if (safe.level === "error") {
      console.error(`[FE Error] ${safe.context ?? "?"} — ${safe.message}`)
    } else {
      console.warn(`[FE ${safe.level}] ${safe.message}`)
    }

    /* Persist to DB (best-effort) */
    try {
      await ensureTable()
      await query(
        `INSERT INTO error_logs (level, message, stack, context, url, user_id, extra)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [safe.level, safe.message, safe.stack ?? null, safe.context ?? null,
         safe.url ?? null, safe.userId ?? null, safe.extra]
      )
    } catch (dbErr) {
      console.warn("[errors] DB persist failed:", dbErr)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}

/* ── GET /api/errors — admin view of recent errors ───────────────── */
export async function GET(req: NextRequest) {
  const adminKey = process.env.ADMIN_SECRET_KEY
  const provided = req.headers.get("x-admin-key") ?? ""
  if (!adminKey || provided !== adminKey) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await ensureTable()
    const rows = await query(
      `SELECT id, level, message, context, url, user_id, extra, created_at
       FROM error_logs
       ORDER BY created_at DESC
       LIMIT 100`
    )
    return NextResponse.json({ errors: rows })
  } catch {
    return NextResponse.json({ errors: [] })
  }
}
