import { NextRequest, NextResponse } from "next/server"
import { chatWithLex, streamChatWithLex, type ChatMessage } from "@/lib/groq"
import { query } from "@/lib/db"
import { getModel, PLAN_LIMITS, type ModelId } from "@/lib/models"
import { requireAuth, getVerifiedUserTier } from "@/lib/auth-guard"
import { chatLimiter, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"

const TIER_ORDER: ("free" | "pro" | "plus" | "ultra")[] = ["free", "pro", "plus", "ultra"]

/* Simple in-memory daily message counter keyed by userId+date */
const dailyCounts = new Map<string, number>()
function checkDailyLimit(userId: string, limit: number): boolean {
  const key = `${userId}:${new Date().toISOString().slice(0, 10)}`
  const count = dailyCounts.get(key) ?? 0
  if (count >= limit) return false
  dailyCounts.set(key, count + 1)
  return true
}

/* Ensure conversations table has user_id column (idempotent) */
async function ensureConversationsSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id         SERIAL PRIMARY KEY,
      session_id TEXT UNIQUE NOT NULL,
      user_id    TEXT,
      messages   JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(() => {})
  await query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id TEXT`).catch(() => {})
}

let schemaReady = false
async function initSchema() {
  if (!schemaReady) { await ensureConversationsSchema(); schemaReady = true }
}

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  /* Burst rate limit: 30 requests, refills 1 per 2s per user+IP */
  const ip  = getClientIp(req)
  const key = `chat:${userId}:${ip}`
  if (!chatLimiter.allow(key)) {
    return rateLimitedResponse(chatLimiter.retryAfter(key))
  }

  try {
    const body = await req.json()
    const {
      messages,
      context,
      sessionId,
      stream,
      modelId    = "lex-flash",
      personality,
      /* tier from body intentionally IGNORED — always look up from DB */
    } = body as {
      messages:     ChatMessage[]
      context?:     string
      sessionId?:   string
      stream?:      boolean
      modelId?:     ModelId
      personality?: string
      tier?:        string
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 })
    }

    /* Cap history depth to prevent prompt injection via crafted history */
    const safeMessages = messages.slice(-40)

    /* ── Verify tier from database — never trust the client ─────── */
    const tier = await getVerifiedUserTier(userId)

    /* ── Model access gate ──────────────────────────────────────── */
    const model       = getModel(modelId)
    const userIdx     = TIER_ORDER.indexOf(tier)
    const requiredIdx = model.requiredTier ? TIER_ORDER.indexOf(model.requiredTier) : 0
    if (userIdx < requiredIdx) {
      console.warn(`[chat] ${userId} tried ${modelId} on ${tier} tier — blocked`)
      return NextResponse.json({
        error:           `${model.name} requires ${(model.requiredTier ?? "pro").toUpperCase()} plan.`,
        upgradeRequired: true,
        requiredTier:    model.requiredTier,
      }, { status: 403 })
    }

    /* ── Daily message quota (server-side, per-account) ─────────── */
    const limits = PLAN_LIMITS[tier]
    if (limits.chat !== null && limits.chat !== undefined) {
      if (!checkDailyLimit(userId, limits.chat)) {
        return NextResponse.json({
          error:          `Daily limit of ${limits.chat} messages reached on the ${tier.toUpperCase()} plan.`,
          quotaExhausted: true,
          limit:          limits.chat,
        }, { status: 429 })
      }
    }

    if (stream) {
      const completion = await streamChatWithLex(safeMessages, context, modelId, personality)
      const encoder    = new TextEncoder()
      const readable   = new ReadableStream({
        async start(controller) {
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? ""
            if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        },
      })
      return new Response(readable, {
        headers: {
          "Content-Type":  "text/event-stream",
          "Cache-Control": "no-cache, no-store",
          "Connection":    "keep-alive",
        },
      })
    }

    const reply = await chatWithLex(safeMessages, context, modelId, personality)

    /* Persist conversation with user_id ownership */
    if (sessionId) {
      await initSchema()
      const allMessages = [...safeMessages, { role: "assistant" as const, content: reply }]
      await query(
        `INSERT INTO conversations (session_id, user_id, messages)
         VALUES ($1, $2, $3)
         ON CONFLICT (session_id) DO UPDATE SET messages = $3, user_id = $2`,
        [sessionId, userId, JSON.stringify(allMessages)]
      ).catch(() => {})
    }

    return NextResponse.json({ reply, model: model.name })
  } catch (err) {
    console.error("[chat] error:", err)
    return NextResponse.json({ error: "Failed to get response from LEX" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  const sessionId = req.nextUrl.searchParams.get("sessionId")
  if (!sessionId) return NextResponse.json({ error: "sessionId is required" }, { status: 400 })

  await initSchema()
  /* Ownership enforced: only return conversations belonging to this user */
  const rows = await query<{ messages: ChatMessage[] }>(
    `SELECT messages FROM conversations
     WHERE session_id = $1 AND (user_id = $2 OR user_id IS NULL)
     ORDER BY created_at DESC LIMIT 1`,
    [sessionId, userId]
  )
  return NextResponse.json({ messages: rows[0]?.messages ?? [] })
}
