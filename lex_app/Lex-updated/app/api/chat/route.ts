import { NextRequest, NextResponse } from "next/server"
import { chatWithLex, streamChatWithLex, type ChatMessage } from "@/lib/groq"
import { query } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, context, sessionId, stream } = body as {
      messages: ChatMessage[]
      context?: string
      sessionId?: string
      stream?: boolean
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 })
    }

    if (stream) {
      const completion = await streamChatWithLex(messages, context)
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        async start(controller) {
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? ""
            if (text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        },
      })
      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    }

    const reply = await chatWithLex(messages, context)

    if (sessionId) {
      const allMessages = [...messages, { role: "assistant" as const, content: reply }]
      await query(
        `INSERT INTO conversations (session_id, messages)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [sessionId, JSON.stringify(allMessages)]
      ).catch(() => {})
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error("[chat] error:", err)
    return NextResponse.json({ error: "Failed to get response from LEX" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId")
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
  }

  const rows = await query<{ messages: ChatMessage[] }>(
    "SELECT messages FROM conversations WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1",
    [sessionId]
  )

  return NextResponse.json({ messages: rows[0]?.messages ?? [] })
}
