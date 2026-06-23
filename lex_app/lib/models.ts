/*
 * LEX AI Model definitions
 * Three tiers of reasoning — each named, gated by subscription plan.
 */

export type ModelId = "lex-flash" | "lex-think" | "lex-reason"

export interface LexModel {
  id:           ModelId
  name:         string
  tagline:      string
  description:  string
  groqModel:    string
  /** minimum plan required — null means free */
  requiredTier: null | "pro" | "plus" | "ultra"
  /** daily chat message limit (null = unlimited) */
  dailyLimit:   number | null
  badge:        string
  color:        string   // tailwind color for badge/highlight
}

export const LEX_MODELS: LexModel[] = [
  {
    id:           "lex-flash",
    name:         "LEX Flash",
    tagline:      "Instant answers",
    description:  "Blazing-fast responses for everyday questions. No plan required.",
    groqModel:    "llama-3.1-8b-instant",
    requiredTier: null,
    dailyLimit:   10,
    badge:        "⚡",
    color:        "amber",
  },
  {
    id:           "lex-think",
    name:         "LEX Think",
    tagline:      "Balanced intelligence",
    description:  "High-quality reasoning for complex tasks. Requires Pro or higher.",
    groqModel:    "llama-3.3-70b-versatile",
    requiredTier: "pro",
    dailyLimit:   null,   // limit set by plan quota
    badge:        "🧠",
    color:        "blue",
  },
  {
    id:           "lex-reason",
    name:         "LEX Reason",
    tagline:      "Deep reasoning",
    description:  "DeepSeek-R1 chain-of-thought reasoning for the hardest problems. Ultra only.",
    groqModel:    "deepseek-r1-distill-llama-70b",
    requiredTier: "ultra",
    dailyLimit:   null,
    badge:        "👑",
    color:        "violet",
  },
]

export function getModel(id: ModelId): LexModel {
  return LEX_MODELS.find(m => m.id === id) ?? LEX_MODELS[0]
}

export const DEFAULT_MODEL_ID: ModelId = "lex-flash"

/* ── Plan limits ─────────────────────────────────────────────────
 *  chat:  daily AI message budget
 *  voice: daily ElevenLabs TTS calls (0 = browser TTS only)
 */
export interface PlanLimits {
  chat:  number | null  // null = unlimited
  voice: number | null  // null = unlimited
}

export const PLAN_LIMITS: Record<"free" | "pro" | "plus" | "ultra", PlanLimits> = {
  free:  { chat: 10,   voice: 10   },
  pro:   { chat: 100,  voice: 100  },
  plus:  { chat: 500,  voice: null },
  ultra: { chat: null, voice: null },
}
