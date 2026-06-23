import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export async function chatWithLex(
  messages: ChatMessage[],
  context?: string
): Promise<string> {
  const systemPrompt = `You are LEX, an intelligent AI assistant and launcher. You are concise, helpful, and proactive. You understand context about what the user is doing and help them accomplish tasks efficiently. You can help with navigation, summarizing content, managing tasks, making calls, sending messages, and much more. ${context ? `\n\nCurrent context: ${context}` : ""}`

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: 512,
    temperature: 0.7,
  })

  return response.choices[0]?.message?.content ?? "I couldn't process that request."
}

export async function streamChatWithLex(
  messages: ChatMessage[],
  context?: string
) {
  const systemPrompt = `You are LEX, an intelligent AI assistant and launcher. You are concise, helpful, and proactive. You understand context about what the user is doing and help them accomplish tasks efficiently. ${context ? `\n\nCurrent context: ${context}` : ""}`

  return groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: 512,
    temperature: 0.7,
    stream: true,
  })
}
