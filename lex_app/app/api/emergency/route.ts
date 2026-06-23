import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAuth } from "@/lib/auth-guard"

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      relation TEXT DEFAULT '',
      priority INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  try {
    await ensureTables()
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
  const { userId, error } = await requireAuth()
  if (error) return error

  try {
    await ensureTables()
    const body = await req.json()
    /* userId from body intentionally ignored */
    const { name, phone, relation = "", priority = 1 } = body

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "name and phone required" }, { status: 400 })
    }

    /* Basic phone validation */
    const cleanPhone = phone.replace(/\s+/g, "")
    if (!/^\+?[\d\-()]{7,20}$/.test(cleanPhone)) {
      return NextResponse.json({ error: "Invalid phone number format" }, { status: 400 })
    }

    const rows = await query<{ id: number }>(
      `INSERT INTO emergency_contacts (user_id, name, phone, relation, priority)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [userId, name.trim().slice(0, 100), cleanPhone, relation.trim().slice(0, 50), Number(priority)]
    )
    return NextResponse.json({ id: rows[0]?.id })
  } catch (err) {
    console.error("[emergency POST]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  try {
    await ensureTables()
    const body = await req.json()
    /* userId from body intentionally ignored */
    const { id, name, phone, relation, priority } = body

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    /* Ownership enforced: WHERE user_id = authenticated userId */
    const result = await query<{ id: number }>(
      `UPDATE emergency_contacts
       SET name     = COALESCE($3, name),
           phone    = COALESCE($4, phone),
           relation = COALESCE($5, relation),
           priority = COALESCE($6, priority)
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId, name ?? null, phone ?? null, relation ?? null, priority ?? null]
    )
    if (!result.length) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[emergency PATCH]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  try {
    await ensureTables()
    const id = req.nextUrl.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const result = await query<{ id: number }>(
      `DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    )
    if (!result.length) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[emergency DELETE]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
