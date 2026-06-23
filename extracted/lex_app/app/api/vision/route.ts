import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"
import { requireAuth } from "@/lib/auth-guard"
import { getClientIp, rateLimitedResponse, visionLimiter } from "@/lib/rate-limit"

const groq        = new Groq({ apiKey: process.env.GROQ_API_KEY })
const visionModel = "meta-llama/llama-4-scout-17b-16e-instruct"
const MAX_BYTES   = 20 * 1024 * 1024

export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  const ip  = getClientIp(req)
  const key = `vision:${userId}:${ip}`
  if (!visionLimiter.allow(key)) return rateLimitedResponse(visionLimiter.retryAfter(key))

  try {
    const formData = await req.formData()
    const image    = formData.get("image") as File | null
    const prompt   = (formData.get("prompt") as string) || "Describe what you see in this image in detail. Be helpful and specific."

    if (!image) return NextResponse.json({ error: "image file required" }, { status: 400 })
    if (image.size > MAX_BYTES) return NextResponse.json({ error: "Image too large (max 20 MB)" }, { status: 413 })

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!allowed.includes(image.type)) {
      return NextResponse.json({ error: "Use JPEG, PNG, GIF, or WebP." }, { status: 415 })
    }

    const buf    = await image.arrayBuffer()
    const b64    = Buffer.from(buf).toString("base64")
    const dataUrl = `data:${image.type};base64,${b64}`

    const resp = await groq.chat.completions.create({
      model: visionModel,
      messages: [{
        role: "user",
        content: [
          { type: "text",      text: prompt },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      }],
      max_tokens: 1024,
    })

    const description = resp.choices[0]?.message?.content ?? "I couldn't analyze this image."
    return NextResponse.json({ description })
  } catch (err) {
    console.error("[vision]", err)
    return NextResponse.json({ error: "Image analysis failed" }, { status: 500 })
  }
}
