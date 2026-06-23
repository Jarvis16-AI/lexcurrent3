import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAuth } from "@/lib/auth-guard"
import { apiLimiter, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS screen_time (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      screen TEXT NOT NULL,
      duration_ms BIGINT NOT NULL,
      recorded_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS analysis_settings (
      user_id TEXT PRIMARY KEY,
      daily_limit_minutes INTEGER DEFAULT 120,
      focus_apps TEXT[] DEFAULT '{}',
      distraction_apps TEXT[] DEFAULT '{}',
      wake_time TEXT DEFAULT '07:00',
      sleep_time TEXT DEFAULT '23:00',
      attention_threshold INTEGER DEFAULT 30
    )
  `)
  await query(`
    CREATE TABLE IF NOT EXISTS usage_patterns (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      last_used TIMESTAMP DEFAULT NOW(),
      hour_of_day INTEGER,
      day_of_week INTEGER
    )
  `)
}

export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  try {
    await ensureTables()
    const type = req.nextUrl.searchParams.get("type") ?? "all"

    if (type === "settings") {
      const rows = await query<Record<string, unknown>>(
        `SELECT * FROM analysis_settings WHERE user_id = $1`, [userId]
      )
      return NextResponse.json({
        settings: rows[0] ?? {
          daily_limit_minutes: 120, focus_apps: [], distraction_apps: [],
          wake_time: "07:00", sleep_time: "23:00", attention_threshold: 30,
        },
      })
    }

    if (type === "patterns") {
      const rows = await query<{ action: string; count: number; last_used: string; hour_of_day: number }>(
        `SELECT action, count, last_used, hour_of_day FROM usage_patterns
         WHERE user_id = $1 ORDER BY count DESC LIMIT 20`,
        [userId]
      )
      return NextResponse.json({ patterns: rows })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const screenRows = await query<{ screen: string; total_ms: string }>(
      `SELECT screen, SUM(duration_ms) as total_ms FROM screen_time
       WHERE user_id = $1 AND recorded_at >= $2
       GROUP BY screen ORDER BY total_ms DESC`,
      [userId, today.toISOString()]
    )

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const weekRows = await query<{ day: string; total_ms: string }>(
      `SELECT DATE(recorded_at) as day, SUM(duration_ms) as total_ms
       FROM screen_time WHERE user_id = $1 AND recorded_at >= $2
       GROUP BY day ORDER BY day`,
      [userId, weekAgo.toISOString()]
    )

    const settingsRows = await query<Record<string, unknown>>(
      `SELECT * FROM analysis_settings WHERE user_id = $1`, [userId]
    )

    return NextResponse.json({
      today: screenRows.map(r => ({ screen: r.screen, ms: Number(r.total_ms) })),
      week:  weekRows.map(r => ({ day: r.day, ms: Number(r.total_ms) })),
      settings: settingsRows[0] ?? null,
    })
  } catch (err) {
    console.error("[analysis GET]", err)
    return NextResponse.json({ today: [], week: [], settings: null })
  }
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  /* Light rate limit on writes */
  const ip = getClientIp(req)
  if (!apiLimiter.allow(`analysis:${userId}:${ip}`)) return rateLimitedResponse(5)

  try {
    await ensureTables()
    const body = await req.json()
    /* Ignore any userId from body — always use the auth'd identity */
    const { type } = body

    if (type === "screen_time") {
      const { screen, duration_ms } = body
      if (!screen || duration_ms === undefined) {
        return NextResponse.json({ error: "screen and duration_ms required" }, { status: 400 })
      }
      await query(
        `INSERT INTO screen_time (user_id, screen, duration_ms) VALUES ($1, $2, $3)`,
        [userId, String(screen).slice(0, 100), Number(duration_ms)]
      )
      return NextResponse.json({ ok: true })
    }

    if (type === "settings") {
      const { daily_limit_minutes, focus_apps, distraction_apps, wake_time, sleep_time, attention_threshold } = body
      await query(
        `INSERT INTO analysis_settings (user_id, daily_limit_minutes, focus_apps, distraction_apps, wake_time, sleep_time, attention_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id) DO UPDATE SET
           daily_limit_minutes = $2, focus_apps = $3, distraction_apps = $4,
           wake_time = $5, sleep_time = $6, attention_threshold = $7`,
        [
          userId,
          daily_limit_minutes ?? 120,
          `{${(focus_apps ?? []).join(",")}}`,
          `{${(distraction_apps ?? []).join(",")}}`,
          wake_time ?? "07:00",
          sleep_time ?? "23:00",
          attention_threshold ?? 30,
        ]
      )
      return NextResponse.json({ ok: true })
    }

    if (type === "usage") {
      const { action, hour_of_day, day_of_week } = body
      if (!action) return NextResponse.json({ error: "action required" }, { status: 400 })

      const safeAction = String(action).slice(0, 120)
      const existing = await query<{ id: number }>(
        `SELECT id FROM usage_patterns WHERE user_id = $1 AND action = $2 LIMIT 1`,
        [userId, safeAction]
      )
      if (existing.length > 0) {
        /* Fix: only use $1, $2, $3 — no orphaned params */
        await query(
          `UPDATE usage_patterns
           SET count = count + 1, last_used = NOW(),
               hour_of_day = $2, day_of_week = $3
           WHERE id = $1`,
          [existing[0].id, hour_of_day ?? new Date().getHours(), day_of_week ?? new Date().getDay()]
        )
      } else {
        await query(
          `INSERT INTO usage_patterns (user_id, action, hour_of_day, day_of_week)
           VALUES ($1, $2, $3, $4)`,
          [userId, safeAction, hour_of_day ?? new Date().getHours(), day_of_week ?? new Date().getDay()]
        )
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 })
  } catch (err) {
    console.error("[analysis POST]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
