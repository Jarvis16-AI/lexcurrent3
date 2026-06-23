import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { requireAuth } from "@/lib/auth-guard"
import { transcribeLimiter, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const MAX_AUDIO_BYTES = 25 * 1024 * 1024 // 25 MB — Groq's limit

export async function POST(req: NextRequest) {
  /* Auth required — Groq transcription is a paid API call */
  const { userId, error } = await requireAuth()
  if (error) return error

  /* Rate limit: 5 burst, then 1 per 20s per user */
  const ip  = getClientIp(req)
  const key = `${userId}:${ip}`
  if (!transcribeLimiter.allow(key)) {
    return rateLimitedResponse(transcribeLimiter.retryAfter(key))
  }

  try {
    const formData = await req.formData()
    const audio = formData.get("audio") as File | null

    if (!audio) {
      return NextResponse.json({ error: "audio file required" }, { status: 400 })
    }

    /* Reject oversized files before sending to Groq */
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: `Audio file too large (max ${MAX_AUDIO_BYTES / 1024 / 1024} MB)` },
        { status: 413 }
      )
    }

    /* Validate MIME type */
    const allowed = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg", "audio/flac"]
    if (!allowed.includes(audio.type)) {
      return NextResponse.json(
        { error: "Unsupported audio format" },
        { status: 415 }
      )
    }

    const transcription = await groq.audio.transcriptions.create({
      file:            audio,
      model:           "whisper-large-v3-turbo",
      language:        "en",
      response_format: "json",
    })

    return NextResponse.json({ transcript: transcription.text })
  } catch (err) {
    console.error("[transcribe]", err)
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 })
  }
}
