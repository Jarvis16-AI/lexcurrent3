import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS face_data (
      id          SERIAL PRIMARY KEY,
      session_key TEXT NOT NULL UNIQUE,
      descriptor  JSONB NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

function getKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "default-owner"
}

/* POST /api/face — enroll face descriptor */
export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const { descriptor } = await req.json()
    if (!descriptor || !Array.isArray(descriptor.values)) {
      return NextResponse.json({ error: "descriptor.values array required" }, { status: 400 })
    }

    const key = getKey(req)
    await query(
      `INSERT INTO face_data (session_key, descriptor)
       VALUES ($1, $2)
       ON CONFLICT (session_key) DO UPDATE
         SET descriptor = EXCLUDED.descriptor, updated_at = NOW()`,
      [key, JSON.stringify(descriptor)]
    )

    return NextResponse.json({ ok: true, enrolled: true })
  } catch (err) {
    console.error("[face/enroll]", err)
    return NextResponse.json({ error: "Failed to enroll face" }, { status: 500 })
  }
}

/* GET /api/face — retrieve stored descriptor */
export async function GET(req: NextRequest) {
  try {
    await ensureTable()
    const key = getKey(req)
    const rows = await query<{ descriptor: { values: number[] } }>(
      `SELECT descriptor FROM face_data WHERE session_key = $1`,
      [key]
    )
    if (!rows.length) return NextResponse.json({ descriptor: null })
    return NextResponse.json({ descriptor: rows[0].descriptor })
  } catch (err) {
    console.error("[face/get]", err)
    return NextResponse.json({ error: "Failed to fetch face data" }, { status: 500 })
  }
}
