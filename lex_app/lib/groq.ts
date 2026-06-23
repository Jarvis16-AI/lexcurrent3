import Groq from "groq-sdk"
import type { ModelId } from "./models"
import { getModel } from "./models"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

function buildSystem(context?: string, personality?: string): string {
  const tone =
    personality === "professional" ? "formal, precise and professional"
    : personality === "concise"    ? "extremely brief — one or two sentences max, no padding"
    : "warm, direct, and conversational — like a smart friend who knows you"

  const base = [
    `You are LEX, an intelligent AI OS built into the user's phone launcher. Your personality is ${tone}.`,
    "You help with everyday tasks: navigation, writing, calculations, coding, research, reminders, decisions, and general knowledge.",
    "",
    "CORE BEHAVIOR:",
    "- Be genuinely helpful and proactive. If you notice something in the context (weather, time of day, current screen),",
    "  use it to give more relevant, personalized answers without being asked.",
    "- Keep responses concise by default. Expand only when depth is clearly needed.",
    "- Use the user's name from memory if you know it — make interactions personal.",
    "- Match the user's energy: casual message → casual reply, detailed question → detailed answer.",
    "",
    "STRICT RULES — never break these:",
    "1. NEVER invent data not in the Context block. If asked about tasks, contacts, health, calendar,",
    "   SMS, or any personal data not listed below, say: \"I don't have access to that right now.\"",
    "2. NEVER claim to have performed real-world actions (sent a message, made a call, set an alarm).",
    "   Always say what you WOULD do and invite the user to confirm.",
    "3. NEVER hallucinate. If you don't know something, say so clearly.",
    "4. Format for readability: use short paragraphs, bullet points for lists, code blocks for code.",
    "   Skip unnecessary headers and filler phrases like \"Certainly!\" or \"Great question!\"",
  ].join("\n")

  const ctx = context?.trim()
    ? `\n\n--- Context (verified real data about this user and device) ---\n${context.trim()}\n--- End Context ---`
    : "\n\n(No additional context available for this session.)"

  return base + ctx
}

/** Strip <think>…</think> reasoning blocks that DeepSeek-R1 / QwQ emit */
function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
}

const isReasonModel = (id: ModelId) => id === "lex-reason"

export async function chatWithLex(
  messages:     ChatMessage[],
  context?:     string,
  modelId:      ModelId = "lex-flash",
  personality?: string,
): Promise<string> {
  const model    = getModel(modelId)
  const isReason = isReasonModel(modelId)
  const response = await groq.chat.completions.create({
    model:       model.groqModel,
    messages:    [{ role: "system", content: buildSystem(context, personality) }, ...messages],
    max_tokens:  isReason ? 8192 : 1024,
    temperature: isReason ? 0.6  : 0.7,
  })
  const raw = response.choices[0]?.message?.content ?? "I couldn't process that request."
  return isReason ? stripThinkTags(raw) : raw
}

export async function streamChatWithLex(
  messages:     ChatMessage[],
  context?:     string,
  modelId:      ModelId = "lex-flash",
  personality?: string,
) {
  const model    = getModel(modelId)
  const isReason = isReasonModel(modelId)
  return groq.chat.completions.create({
    model:       model.groqModel,
    messages:    [{ role: "system", content: buildSystem(context, personality) }, ...messages],
    max_tokens:  isReason ? 8192 : 1024,
    temperature: isReason ? 0.6  : 0.7,
    stream:      true,
  })
}
