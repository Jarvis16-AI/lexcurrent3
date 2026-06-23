import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminKey } from "@/lib/auth-guard"

/**
 * POST /api/seed-bypass
 *
 * ADMIN ONLY — requires X-Admin-Key header matching ADMIN_SECRET_KEY env var.
 * Seeds the bypass_codes table with developer/beta access codes.
 *
 * This endpoint is intentionally dangerous (deletes + re-creates all codes)
 * and MUST NOT be callable by unauthenticated users.
 */
export async function POST(req: NextRequest) {
  const adminErr = requireAdminKey(req)
  if (adminErr) return adminErr

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

    await query(`DELETE FROM bypass_codes`)

    const codes = [
      { code: "LEX-PRO-2025",    label: "LEX Pro Developer",       tier: "pro",   uses: 100,  days: 365 },
      { code: "LEX-PLUS-2025",   label: "LEX Plus Developer",      tier: "plus",  uses: 50,   days: 365 },
      { code: "LEX-ULTRA-2025",  label: "LEX Ultra Developer",     tier: "ultra", uses: 20,   days: 365 },
      { code: "LEX-BETA-ACCESS", label: "Beta Tester — Pro",       tier: "pro",   uses: 200,  days: 180 },
      { code: "LEX-VIP-ULTRA",   label: "VIP Ultra Access",        tier: "ultra", uses: 5,    days: 90  },
      { code: "LEX-LAUNCH-PRO",  label: "Launch Event Pro",        tier: "pro",   uses: 500,  days: 60  },
      { code: "LEX-TEAM-PLUS",   label: "Team Plus Pass",          tier: "plus",  uses: null, days: 365 },
      { code: "LEX-DEMO-ULTRA",  label: "Demo Ultra (1 use)",      tier: "ultra", uses: 1,    days: 30  },
      { code: "LEX-FREE-MONTH",  label: "Free Month — Pro",        tier: "pro",   uses: 1000, days: 30  },
      { code: "LEX-DEV-LOCAL",   label: "Dev Local — Ultra",       tier: "ultra", uses: null, days: 9999},
    ]

    for (const c of codes) {
      const exp = new Date()
      exp.setDate(exp.getDate() + c.days)
      await query(
        `INSERT INTO bypass_codes (code, label, tier, uses_left, expires_at, used_count, active)
         VALUES ($1, $2, $3, $4, $5, 0, TRUE)
         ON CONFLICT (code) DO UPDATE SET
           label = EXCLUDED.label, tier = EXCLUDED.tier,
           uses_left = EXCLUDED.uses_left, expires_at = EXCLUDED.expires_at,
           used_count = 0, active = TRUE`,
        [c.code, c.label, c.tier, c.uses, exp.toISOString()]
      )
    }

    const rows = await query<{ code: string; label: string; tier: string; uses_left: number | null; expires_at: string }>(
      `SELECT code, label, tier, uses_left, expires_at FROM bypass_codes ORDER BY id`
    )

    console.log(`[seed-bypass] Seeded ${rows.length} bypass codes by admin`)
    return NextResponse.json({ ok: true, seeded: rows.length, codes: rows })
  } catch (err) {
    console.error("[seed-bypass]", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
