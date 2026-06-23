import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAdminKey } from "@/lib/auth-guard"

function generateCode(tier: string): string {
  const prefix = tier === "ultra" ? "UL" : tier === "plus" ? "PL" : "PR"
  const chars  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let rand = ""
  for (let i = 0; i < 8; i++) rand += chars[Math.floor(Math.random() * chars.length)]
  return `LEX-${prefix}-${rand}`
}

export async function POST(req: NextRequest) {
  const adminErr = requireAdminKey(req)
  if (adminErr) return adminErr

  try {
    const body = await req.json()
    const { tier, label, uses, expiryDays, customCode } = body as {
      tier:        "pro" | "plus" | "ultra"
      label:       string
      uses?:       number | null
      expiryDays?: number | null
      customCode?: string
    }

    if (!tier || !["pro", "plus", "ultra"].includes(tier)) {
      return NextResponse.json({ error: "tier must be pro, plus, or ultra" }, { status: 400 })
    }
    if (!label?.trim()) {
      return NextResponse.json({ error: "label is required" }, { status: 400 })
    }

    /* Ensure the bypass_codes table exists */
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

    /* Generate or validate custom code */
    const finalCode = customCode?.trim().toUpperCase() ?? generateCode(tier)

    /* Expiry date */
    let expiresAt: string | null = null
    if (expiryDays && expiryDays > 0) {
      const d = new Date()
      d.setDate(d.getDate() + expiryDays)
      expiresAt = d.toISOString()
    }

    const rows = await query<{
      id:         number
      code:       string
      label:      string
      tier:       string
      uses_left:  number | null
      expires_at: string | null
      created_at: string
    }>(
      `INSERT INTO bypass_codes (code, label, tier, uses_left, expires_at, used_count, active)
       VALUES ($1, $2, $3, $4, $5, 0, TRUE)
       RETURNING id, code, label, tier, uses_left, expires_at, created_at`,
      [finalCode, label.trim(), tier, uses ?? null, expiresAt]
    )

    console.log(`[bypass/create] Created code ${finalCode} (${tier}) — "${label.trim()}"`)
    return NextResponse.json({ ok: true, code: rows[0] }, { status: 201 })
  } catch (err: unknown) {
    const msg = String((err as { detail?: string; message?: string })?.detail ?? (err as Error)?.message ?? err)
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json({ error: "That code already exists. Choose a different one." }, { status: 409 })
    }
    console.error("[bypass/create]", err)
    return NextResponse.json({ error: "Failed to create code" }, { status: 500 })
  }
}
