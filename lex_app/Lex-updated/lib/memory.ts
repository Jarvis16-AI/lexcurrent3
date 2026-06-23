import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const MEMORY_CATEGORIES = [
  { key: "personal",       label: "Personal",        color: "#3b82f6", bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.4)",  desc: "Name, age, location, background" },
  { key: "interests",      label: "Interests",       color: "#22c55e", bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.4)",   desc: "Hobbies, likes, dislikes" },
  { key: "relationships",  label: "Relationships",   color: "#a855f7", bg: "rgba(168,85,247,0.15)",  border: "rgba(168,85,247,0.4)",  desc: "Family, friends, colleagues" },
  { key: "habits",         label: "Habits",          color: "#f97316", bg: "rgba(249,115,22,0.15)",  border: "rgba(249,115,22,0.4)",  desc: "Routines, schedules, patterns" },
  { key: "emotions",       label: "Emotions",        color: "#ec4899", bg: "rgba(236,72,153,0.15)",  border: "rgba(236,72,153,0.4)",  desc: "Feelings, preferences, mood" },
  { key: "knowledge",      label: "Knowledge",       color: "#eab308", bg: "rgba(234,179,8,0.15)",   border: "rgba(234,179,8,0.4)",   desc: "Expertise, work, skills" },
  { key: "goals",          label: "Goals",           color: "#ef4444", bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.4)",   desc: "Aspirations, plans, desires" },
  { key: "preferences",    label: "Preferences",     color: "#06b6d4", bg: "rgba(6,182,212,0.15)",   border: "rgba(6,182,212,0.4)",   desc: "Settings, choices, styles" },
]

export function getCategoryMeta(key: string) {
  return MEMORY_CATEGORIES.find(c => c.key === key) ?? MEMORY_CATEGORIES[0]
}

export async function extractMemoriesFromChat(
  userMessage: string,
  assistantReply: string
): Promise<Array<{ category: string; content: string; confidence: number }>> {
  try {
    const prompt = `Analyze this conversation exchange and extract any factual information the user reveals about themselves. Return a JSON array of memory objects. Only extract clear facts — no guesses.

User said: "${userMessage}"
Assistant replied: "${assistantReply}"

Categories: personal (name/age/location), interests (hobbies/likes), relationships (people they mention), habits (routines), emotions (feelings/preferences), knowledge (work/skills), goals (plans/aspirations), preferences (choices/settings).

Return ONLY a JSON array like:
[{"category": "personal", "content": "User's name is John", "confidence": 0.95}]

If nothing meaningful is revealed, return: []`

    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    })

    const text = res.choices[0]?.message?.content ?? "[]"
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    return JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
}

export async function buildMemoryContext(memories: Array<{ category: string; content: string }>): Promise<string> {
  if (!memories.length) return ""
  const grouped = memories.reduce<Record<string, string[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    acc[m.category].push(m.content)
    return acc
  }, {})
  const lines = Object.entries(grouped).map(([cat, items]) => `${cat}: ${items.join("; ")}`)
  return `\n\nWhat LEX knows about the user:\n${lines.join("\n")}`
}
