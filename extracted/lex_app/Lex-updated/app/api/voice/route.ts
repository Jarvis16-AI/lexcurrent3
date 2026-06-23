import { NextRequest, NextResponse } from "next/server"
import { textToSpeech, getVoices } from "@/lib/elevenlabs"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, voiceId } = body as { text: string; voiceId?: string }

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "text is required" }, { status: 400 })
    }
    if (text.length > 1000) {
      return NextResponse.json({ error: "Text too long (max 1000 chars)" }, { status: 400 })
    }
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "Voice service not configured. Please add ELEVENLABS_API_KEY." }, { status: 503 })
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
  try {
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ voices: [], configured: false })
    }
    const voices = await getVoices()
    return NextResponse.json({ voices, configured: true })
  } catch (err) {
    console.error("[voice/list] error:", err)
    return NextResponse.json({ voices: [], configured: false })
  }
}
