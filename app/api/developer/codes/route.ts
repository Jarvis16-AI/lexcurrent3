import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAuth } from "@/lib/auth-guard"
import { isDeveloper } from "@/lib/developer"
import { randomBytes } from "crypto"

async function ensureTable() {
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
  `).catch(() => {})
}

function generateCode(tier: string): string {
  const suffix = randomBytes(3).toString("hex").toUpperCase()
  return `LEX-${tier.toUpperCase()}-${suffix}`
}

/* GET /api/developer/codes — list all codes */
export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error
  if (!isDeveloper(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await ensureTable()
  const rows = await query<{
    id: number; code: string; label: string; tier: string
    uses_left: number | null; expires_at: string | null
    used_count: number; active: boolean; created_at: string
  }>(`SELECT id, code, label, tier, uses_left, expires_at, used_count, active, created_at
      FROM bypass_codes ORDER BY id DESC`)

  return NextResponse.json({ codes: rows })
}

/* POST /api/developer/codes — generate a new code */
export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error
  if (!isDeveloper(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await ensureTable()

  const { tier = "pro", label, durationDays, usesLeft } = await req.json() as {
    tier?: string; label?: string; durationDays?: number | null; usesLeft?: number | null
  }

  if (!["pro", "plus", "ultra"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier. Must be pro, plus, or ultra." }, { status: 400 })
  }

  const code    = generateCode(tier)
  const expires = durationDays
    ? new Date(Date.now() + durationDays * 86_400_000).toISOString()
    : null

  await query(
    `INSERT INTO bypass_codes (code, label, tier, uses_left, expires_at, used_count, active)
     VALUES ($1, $2, $3, $4, $5, 0, TRUE)`,
    [code, label ?? `Generated ${tier.toUpperCase()} code`, tier, usesLeft ?? null, expires]
  )

  return NextResponse.json({ ok: true, code, tier, expiresAt: expires })
}

/* PATCH /api/developer/codes — disable / re-enable a code */
export async function PATCH(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error
  if (!isDeveloper(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { code, active } = await req.json() as { code: string; active: boolean }
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 })

  await query(`UPDATE bypass_codes SET active = $1 WHERE code = $2`, [active, code.toUpperCase()])
  return NextResponse.json({ ok: true })
}
