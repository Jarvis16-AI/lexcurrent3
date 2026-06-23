import { NextRequest, NextResponse } from "next/server"
import { textToSpeech, getVoices } from "@/lib/edge-tts"
import { requireAuth, getVerifiedUserTier } from "@/lib/auth-guard"
import { voiceLimiter, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  /* Auth required — TTS is a backend API call */
  const { userId, error } = await requireAuth()
  if (error) return error

  /* Rate limit: 10 burst, 1 per 10s per user */
  const ip  = getClientIp(req)
  const key = `voice:${userId}:${ip}`
  if (!voiceLimiter.allow(key)) {
    return rateLimitedResponse(voiceLimiter.retryAfter(key))
  }

  try {
    const body = await req.json()
    const { text, voiceId } = body as { text: string; voiceId?: string }

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }
    if (text.length > 1000) {
      return NextResponse.json({ error: "Text too long (max 1000 chars)" }, { status: 400 })
    }

    /* Verify the user's actual tier from DB — never trust client-supplied tier */
    const tier   = await getVerifiedUserTier(userId)
    const limits = { free: 20, pro: 100, plus: 300, ultra: null } as Record<string, number | null>
    const limit  = limits[tier] ?? 20

    /* Daily voice usage — track per userId */
    const dayKey = `voice:daily:${userId}:${new Date().toISOString().slice(0, 10)}`
    if (limit !== null && !voiceLimiter.allow(dayKey, 0.001)) {
      return NextResponse.json({
        error:          `Daily voice limit reached on the ${tier.toUpperCase()} plan. Upgrade for more.`,
        quotaExhausted: true,
        limit,
      }, { status: 429 })
    }

    const audioBuffer = await textToSpeech(text, voiceId)

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type":   "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control":  "no-store",
      },
    })
  } catch (err) {
    console.error("[voice] error:", err)
    return NextResponse.json({ error: "Failed to generate voice" }, { status: 500 })
  }
}

export async function GET() {
  const voices = getVoices()
  return NextResponse.json({ voices, configured: true })
}
