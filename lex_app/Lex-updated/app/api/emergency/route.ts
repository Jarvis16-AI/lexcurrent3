import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'local',
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relation TEXT DEFAULT '',
      priority INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

export async function GET(req: NextRequest) {
  try {
    await ensureTables()
    const userId = req.nextUrl.searchParams.get("userId") ?? "local"
    const rows = await query<{ id: number; name: string; phone: string; relation: string; priority: number }>(
      `SELECT id, name, phone, relation, priority FROM emergency_contacts
       WHERE user_id = $1 ORDER BY priority ASC, name ASC`,
      [userId]
    )
    return NextResponse.json({ contacts: rows })
  } catch (err) {
    console.error("[emergency GET]", err)
    return NextResponse.json({ contacts: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables()
    const body = await req.json()
    const { userId = "local", name, phone, relation = "", priority = 1 } = body
    if (!name || !phone) return NextResponse.json({ error: "name and phone required" }, { status: 400 })
    const rows = await query<{ id: number }>(
      `INSERT INTO emergency_contacts (user_id, name, phone, relation, priority) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, name.trim(), phone.trim(), relation.trim(), priority]
    )
    return NextResponse.json({ id: rows[0]?.id })
  } catch (err) {
    console.error("[emergency POST]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureTables()
    const body = await req.json()
    const { id, userId = "local", name, phone, relation, priority } = body
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await query(
      `UPDATE emergency_contacts SET name = COALESCE($3, name), phone = COALESCE($4, phone),
       relation = COALESCE($5, relation), priority = COALESCE($6, priority)
       WHERE id = $1 AND user_id = $2`,
      [id, userId, name ?? null, phone ?? null, relation ?? null, priority ?? null]
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[emergency PATCH]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTables()
    const id = req.nextUrl.searchParams.get("id")
    const userId = req.nextUrl.searchParams.get("userId") ?? "local"
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
    await query(`DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2`, [id, userId])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[emergency DELETE]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
