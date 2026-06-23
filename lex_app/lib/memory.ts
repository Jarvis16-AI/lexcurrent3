import Groq from "groq-sdk"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const MEMORY_CATEGORIES = [
  { key: "personal",      label: "Personal",      color: "#3b82f6", bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.4)",  desc: "Name, age, location, background" },
  { key: "interests",     label: "Interests",     color: "#22c55e", bg: "rgba(34,197,94,0.15)",   border: "rgba(34,197,94,0.4)",   desc: "Hobbies, likes, dislikes" },
  { key: "relationships", label: "Relationships", color: "#a855f7", bg: "rgba(168,85,247,0.15)",  border: "rgba(168,85,247,0.4)",  desc: "Family, friends, colleagues" },
  { key: "habits",        label: "Habits",        color: "#f97316", bg: "rgba(249,115,22,0.15)",  border: "rgba(249,115,22,0.4)",  desc: "Routines, schedules, patterns" },
  { key: "emotions",      label: "Emotions",      color: "#ec4899", bg: "rgba(236,72,153,0.15)",  border: "rgba(236,72,153,0.4)",  desc: "Feelings, preferences, mood" },
  { key: "knowledge",     label: "Knowledge",     color: "#eab308", bg: "rgba(234,179,8,0.15)",   border: "rgba(234,179,8,0.4)",   desc: "Expertise, work, skills" },
  { key: "goals",         label: "Goals",         color: "#ef4444", bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.4)",   desc: "Aspirations, plans, desires" },
  { key: "preferences",   label: "Preferences",   color: "#06b6d4", bg: "rgba(6,182,212,0.15)",   border: "rgba(6,182,212,0.4)",   desc: "Settings, choices, styles" },
]

export function getCategoryMeta(key: string) {
  return MEMORY_CATEGORIES.find(c => c.key === key) ?? MEMORY_CATEGORIES[0]
}

/** How "alive" a memory is — confidence + recency combined */
export function getMemoryVitality(
  confidence: number,
  lastReinforced: string
): "fresh" | "fading" | "dormant" {
  const daysSince = (Date.now() - new Date(lastReinforced).getTime()) / 86_400_000
  if (confidence >= 0.8 && daysSince < 7)  return "fresh"
  if (confidence >= 0.4 || daysSince < 30) return "fading"
  return "dormant"
}

export async function extractMemoriesFromChat(
  userMessage: string,
  assistantReply: string
): Promise<Array<{ category: string; content: string; confidence: number }>> {
  try {
    const prompt = `Analyze this conversation exchange and extract factual information the user reveals about themselves.

User said: "${userMessage.slice(0, 500)}"
Assistant replied: "${assistantReply.slice(0, 500)}"

Categories (pick the most specific fit):
- personal: name, age, location, nationality, occupation, physical attributes
- interests: hobbies, sports, music, movies, games, books, food preferences
- relationships: family members, partner, friends, colleagues (with names/context)
- habits: daily routines, sleep schedule, exercise patterns, diet habits
- emotions: feelings expressed, emotional state, stress level, what makes them happy/sad
- knowledge: expertise area, education, skills, work domain
- goals: aspirations, plans, projects, what they want to achieve
- preferences: preferred style, choices, settings, opinions on things

Rules:
- Only extract clear, stated facts — no assumptions or guesses
- Each fact should be a complete, standalone sentence starting with "User"
- Confidence 0.9+ for directly stated facts, 0.7 for strongly implied
- Skip generic/vague statements that could apply to anyone
- Skip assistant-generated content — only what the USER reveals

Return ONLY a JSON array:
[{"category": "personal", "content": "User's name is John", "confidence": 0.95}]

If nothing meaningful is revealed, return: []`

    const res = await groq.chat.completions.create({
      model:       "llama-3.1-8b-instant",
      messages:    [{ role: "user", content: prompt }],
      max_tokens:  400,
      temperature: 0.2,
    })

    const text      = res.choices[0]?.message?.content ?? "[]"
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []

    /* Validate each entry */
    return parsed.filter(
      (m: unknown) =>
        m &&
        typeof m === "object" &&
        typeof (m as Record<string, unknown>).category === "string" &&
        typeof (m as Record<string, unknown>).content  === "string" &&
        (m as Record<string, unknown>).content !== "" &&
        MEMORY_CATEGORIES.some(c => c.key === (m as Record<string, unknown>).category)
    )
  } catch {
    return []
  }
}

/** Summarize many memories in one category into a concise digest */
export async function summarizeMemories(
  category: string,
  contents: string[]
): Promise<string> {
  if (contents.length <= 3) return contents.join("; ")
  try {
    const res = await groq.chat.completions.create({
      model:    "llama-3.1-8b-instant",
      messages: [{
        role:    "user",
        content: `Summarize these ${category} facts about a person into 1–2 concise sentences, keeping all key details:\n${contents.join("\n")}`,
      }],
      max_tokens:  120,
      temperature: 0.2,
    })
    return res.choices[0]?.message?.content?.trim() ?? contents.join("; ")
  } catch {
    return contents.join("; ")
  }
}

export async function buildMemoryContext(
  memories: Array<{ category: string; content: string; confidence: number; last_reinforced?: string; reinforcement_count?: number }>
): Promise<string> {
  if (!memories.length) return ""

  /* Sort by confidence × recency score */
  const scored = memories.map(m => {
    const daysSince = (Date.now() - new Date(m.last_reinforced ?? new Date()).getTime()) / 86_400_000
    const recencyScore = Math.max(0, 1 - daysSince / 60)
    const score = (m.confidence * 0.7) + (recencyScore * 0.3) + ((m.reinforcement_count ?? 1) > 1 ? 0.1 : 0)
    return { ...m, score }
  }).sort((a, b) => b.score - a.score)

  /* Group by category, capped at top 4 per category to prevent bloat */
  const grouped = scored.reduce<Record<string, string[]>>((acc, m) => {
    if (!acc[m.category]) acc[m.category] = []
    if (acc[m.category].length < 4) acc[m.category].push(m.content)
    return acc
  }, {})

  /* Only include categories that have memories */
  const lines = Object.entries(grouped)
    .filter(([, items]) => items.length > 0)
    .map(([cat, items]) => `  ${cat}: ${items.join("; ")}`)

  /* Freshly confirmed facts get highlighted */
  const fresh: string[] = []
  for (const m of scored.slice(0, 10)) {
    const v = getMemoryVitality(m.confidence, m.last_reinforced ?? new Date().toISOString())
    if (v === "fresh") fresh.push(`${m.content} (${m.category})`)
  }

  const parts = [`What LEX knows about the user:\n${lines.join("\n")}`]
  if (fresh.length) {
    parts.push(`Recently confirmed facts: ${fresh.slice(0, 5).join("; ")}`)
  }

  return `\n\n${parts.join("\n")}`
}

/** Generate a smart, context-aware greeting based on user memories */
export async function buildPersonalizedGreeting(
  memories: Array<{ category: string; content: string }>,
  timeOfDay: "morning" | "afternoon" | "evening" | "night"
): Promise<string> {
  const greetings: Record<string, string> = {
    morning:   "Good morning",
    afternoon: "Good afternoon",
    evening:   "Good evening",
    night:     "Hey",
  }
  const base = greetings[timeOfDay]

  /* Try to extract the user's name from memories */
  const nameMem = memories.find(m =>
    m.category === "personal" &&
    m.content.toLowerCase().includes("name is") &&
    !m.content.toLowerCase().includes("username")
  )
  if (nameMem) {
    const match = nameMem.content.match(/name is ([A-Z][a-z]+)/i)
    if (match?.[1]) return `${base}, ${match[1]}`
  }

  return base
}
