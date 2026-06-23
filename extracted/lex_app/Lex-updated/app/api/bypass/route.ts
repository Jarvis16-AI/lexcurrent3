import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

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

/* ── POST /api/bypass  — validate and redeem a code ── */
export async function POST(req: NextRequest) {
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

    /* decrement uses_left (if limited) and increment used_count */
    await query(
      `UPDATE bypass_codes
       SET used_count = used_count + 1,
           uses_left  = CASE WHEN uses_left IS NOT NULL THEN uses_left - 1 ELSE NULL END
       WHERE id = $1`,
      [row.id]
    )

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

/* ── GET /api/bypass  — list all codes (dev dashboard) ── */
export async function GET() {
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

/* ── DELETE /api/bypass  — deactivate a code ── */
export async function DELETE(req: NextRequest) {
  try {
    const { code } = (await req.json()) as { code?: string }
    if (!code) return NextResponse.json({ error: "No code." }, { status: 400 })
    await query(`UPDATE bypass_codes SET active = FALSE WHERE code = $1`, [code.toUpperCase()])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[bypass/delete] error:", err)
    return NextResponse.json({ error: "Server error." }, { status: 500 })
  }
}
