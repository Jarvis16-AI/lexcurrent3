import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { extractMemoriesFromChat } from "@/lib/memory"
import { requireAuth } from "@/lib/auth-guard"
import { memoryLimiter, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS memories (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      confidence FLOAT DEFAULT 1.0,
      reinforcement_count INT DEFAULT 1,
      last_reinforced TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
  await query(`ALTER TABLE memories ADD COLUMN IF NOT EXISTS reinforcement_count INT DEFAULT 1`).catch(() => {})
}

export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  try {
    await ensureTables()
    const rows = await query<{ id: number; category: string; content: string; confidence: number; last_reinforced: string; created_at: string }>(
      `SELECT id, category, content, confidence, last_reinforced, created_at
       FROM memories WHERE user_id = $1
       ORDER BY last_reinforced DESC`,
      [userId]
    )
    return NextResponse.json({ memories: rows })
  } catch (err) {
    console.error("[memory GET]", err)
    return NextResponse.json({ memories: [] })
  }
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  /* Rate-limit writes */
  const ip = getClientIp(req)
  if (!memoryLimiter.allow(`${userId}:${ip}`)) return rateLimitedResponse(10)

  try {
    await ensureTables()
    const body = await req.json()
    /* Note: userId from body is intentionally ignored — always use the auth'd userId */
    const { category, content, confidence = 1.0, userMessage, assistantReply } = body

    if (userMessage && assistantReply) {
      const extracted = await extractMemoriesFromChat(userMessage, assistantReply)
      const inserted = []
      for (const mem of extracted) {
        if (!mem.content?.trim()) continue
        const existing = await query<{ id: number }>(
          `SELECT id FROM memories WHERE user_id = $1 AND content ILIKE $2 LIMIT 1`,
          [userId, `%${mem.content.slice(0, 40)}%`]
        )
        if (existing.length > 0) {
          await query(
            `UPDATE memories
             SET last_reinforced = NOW(),
                 confidence = LEAST(1.0, confidence + 0.05),
                 reinforcement_count = reinforcement_count + 1
             WHERE id = $1`,
            [existing[0].id]
          )
        } else {
          const rows = await query<{ id: number }>(
            `INSERT INTO memories (user_id, category, content, confidence)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [userId, mem.category, mem.content, mem.confidence ?? 1.0]
          )
          inserted.push(rows[0])
        }
      }
      return NextResponse.json({ extracted: extracted.length, inserted: inserted.length })
    }

    if (category && content) {
      const rows = await query<{ id: number }>(
        `INSERT INTO memories (user_id, category, content, confidence)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, category, content.trim(), confidence]
      )
      return NextResponse.json({ id: rows[0]?.id })
    }

    return NextResponse.json(
      { error: "Provide category+content or userMessage+assistantReply" },
      { status: 400 }
    )
  } catch (err) {
    console.error("[memory POST]", err)
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

    /* Ownership enforced server-side: user_id = authenticated userId */
    const result = await query<{ id: number }>(
      `DELETE FROM memories WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    )
    if (!result.length) {
      return NextResponse.json({ error: "Not found or not yours" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[memory DELETE]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
