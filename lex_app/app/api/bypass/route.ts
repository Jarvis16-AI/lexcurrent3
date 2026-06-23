import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requireAuth, requireAdminKey } from "@/lib/auth-guard"
import { bypassLimiter, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"

interface BypassCode {
  id:         number
  code:       string
  label:      string
  tier:       string
  uses_left:  number | null
  expires_at: string | null
  used_count: number
  active:     boolean
}

async function ensureBypassTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS bypass_codes (
        id         SERIAL PRIMARY KEY,
        code       TEXT UNIQUE NOT NULL,
        label      TEXT NOT NULL,
        tier       TEXT NOT NULL DEFAULT 'pro',
        uses_left  INTEGER,
        expires_at TIMESTAMPTZ,
        used_count INTEGER NOT NULL DEFAULT 0,
        active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
  } catch (e) {
    console.warn("[bypass] ensureBypassTable failed:", e)
  }
}

/* ── POST /api/bypass — redeem a bypass code (auth required, rate-limited) ── */
export async function POST(req: NextRequest) {
  /* Require Clerk auth to redeem codes */
  const { userId, error: authErr } = await requireAuth()
  if (authErr) return authErr

  /* Brute-force protection: 5 attempts, then block for ~12 min */
  const ip  = getClientIp(req)
  const key = `bypass:${userId}:${ip}`
  if (!bypassLimiter.allow(key)) {
    console.warn(`[bypass] Rate limit hit for user ${userId} from ${ip}`)
    return rateLimitedResponse(bypassLimiter.retryAfter(key))
  }

  /* Ensure table exists (safe to call on every request; is a no-op if table already exists) */
  await ensureBypassTable()

  try {
    const { code } = (await req.json()) as { code?: string }
    if (!code?.trim()) {
      return NextResponse.json({ valid: false, error: "No code provided." }, { status: 400 })
    }

    const row = await queryOne<BypassCode>(
      `SELECT * FROM bypass_codes WHERE code = $1`,
      [code.trim().toUpperCase()]
    )

    if (!row) {
      console.warn(`[bypass] Invalid code attempt by user ${userId}`)
      return NextResponse.json({ valid: false, error: "Invalid code." }, { status: 404 })
    }
    if (!row.active) {
      return NextResponse.json({ valid: false, error: "This code has been deactivated." }, { status: 403 })
    }
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "This code has expired." }, { status: 403 })
    }
    if (row.uses_left !== null && row.uses_left <= 0) {
      return NextResponse.json({ valid: false, error: "This code has no uses remaining." }, { status: 403 })
    }

    /* Decrement uses_left and increment used_count */
    await query(
      `UPDATE bypass_codes
       SET used_count = used_count + 1,
           uses_left  = CASE WHEN uses_left IS NOT NULL THEN uses_left - 1 ELSE NULL END
       WHERE id = $1`,
      [row.id]
    )

    console.log(`[bypass] Code "${row.label}" redeemed by user ${userId} — tier: ${row.tier}`)
    return NextResponse.json({
      valid: true,
      tier:  row.tier,
      label: row.label,
      usesRemaining: row.uses_left !== null ? row.uses_left - 1 : null,
    })
  } catch (err) {
    console.error("[bypass] error:", err)
    return NextResponse.json({ valid: false, error: "Server error." }, { status: 500 })
  }
}

/* ── GET /api/bypass — list all codes (admin only) ── */
export async function GET(req: NextRequest) {
  const adminErr = requireAdminKey(req)
  if (adminErr) return adminErr

  try {
    const rows = await query<BypassCode>(
      `SELECT id, code, label, tier, uses_left, expires_at, used_count, active, created_at
       FROM bypass_codes ORDER BY id`
    )
    return NextResponse.json({ codes: rows })
  } catch (err) {
    console.error("[bypass/list] error:", err)
    return NextResponse.json({ codes: [], error: "Server error." }, { status: 500 })
  }
}

/* ── DELETE /api/bypass — deactivate a code (admin only) ── */
export async function DELETE(req: NextRequest) {
  const adminErr = requireAdminKey(req)
  if (adminErr) return adminErr

  try {
    const { code } = (await req.json()) as { code?: string }
    if (!code) return NextResponse.json({ error: "No code." }, { status: 400 })
    await query(`UPDATE bypass_codes SET active = FALSE WHERE code = $1`, [code.toUpperCase()])
    console.log(`[bypass] Code deactivated by admin: ${code}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[bypass/delete] error:", err)
    return NextResponse.json({ error: "Server error." }, { status: 500 })
  }
}
