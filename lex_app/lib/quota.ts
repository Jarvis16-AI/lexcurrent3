"use client"

export const FREE_DAILY_LIMIT = 10

export type PremiumTier = "pro" | "plus" | "ultra"

export interface QuotaData {
  date:  string
  count: number
}

export interface PremiumData {
  tier:  PremiumTier
  until: number
}

const QUOTA_KEY   = "lex-quota-v1"
const PREMIUM_KEY = "lex-premium-v1"

function today() { return new Date().toISOString().slice(0, 10) }

export function getQuota(): { count: number; limit: number; exhausted: boolean; remaining: number } {
  if (typeof window === "undefined") return { count: 0, limit: FREE_DAILY_LIMIT, exhausted: false, remaining: FREE_DAILY_LIMIT }
  try {
    const raw  = localStorage.getItem(QUOTA_KEY)
    const data: QuotaData = raw ? JSON.parse(raw) : { date: today(), count: 0 }
    const count = data.date === today() ? data.count : 0
    return { count, limit: FREE_DAILY_LIMIT, exhausted: count >= FREE_DAILY_LIMIT, remaining: Math.max(0, FREE_DAILY_LIMIT - count) }
  } catch { return { count: 0, limit: FREE_DAILY_LIMIT, exhausted: false, remaining: FREE_DAILY_LIMIT } }
}

export function incrementQuota() {
  if (typeof window === "undefined") return
  try {
    const raw  = localStorage.getItem(QUOTA_KEY)
    const data: QuotaData = raw ? JSON.parse(raw) : { date: today(), count: 0 }
    if (data.date !== today()) { data.date = today(); data.count = 0 }
    data.count++
    localStorage.setItem(QUOTA_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function isPremium(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem(PREMIUM_KEY)
    if (!raw) return false
    const data: PremiumData = JSON.parse(raw)
    return data.until > Date.now()
  } catch { return false }
}

export function getPremiumTier(): PremiumTier | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(PREMIUM_KEY)
    if (!raw) return null
    const data: PremiumData = JSON.parse(raw)
    return data.until > Date.now() ? data.tier : null
  } catch { return null }
}

export function hasAtLeast(required: PremiumTier): boolean {
  const tier = getPremiumTier()
  if (!tier) return false
  const order: PremiumTier[] = ["pro", "plus", "ultra"]
  return order.indexOf(tier) >= order.indexOf(required)
}

export function setPremium(tier: PremiumTier, durationDays = 30) {
  const data: PremiumData = { tier, until: Date.now() + durationDays * 86_400_000 }
  localStorage.setItem(PREMIUM_KEY, JSON.stringify(data))
}

export function clearPremium() {
  localStorage.removeItem(PREMIUM_KEY)
}

/* ── plan definitions ──────────────────────────────────────────── */
export const PLANS = [
  {
    tier:    "pro"   as PremiumTier,
    name:    "Pro",
    price:   "$4.99",
    period:  "/month",
    tagline: "Power up your LEX",
    color1:  "#0a1628",
    color2:  "#003087",
    accent:  "#4a9eff",
    emoji:   "⚡",
    features: [
      "100 messages per day",
      "All ElevenLabs voices",
      "All 8 lock screen wallpapers",
      "AI personality modes",
      "🔒 AI lock screen widgets",
      "🔒 Context cards on lock screen",
    ],
  },
  {
    tier:    "plus"  as PremiumTier,
    name:    "Plus",
    price:   "$8.99",
    period:  "/month",
    tagline: "For power users",
    color1:  "#120a28",
    color2:  "#4a0080",
    accent:  "#a855f7",
    emoji:   "🚀",
    features: [
      "Everything in Pro",
      "500 messages per day",
      "Priority voice synthesis",
      "🔒 Smart reminders on lock screen",
      "🔒 Daily briefing on lock screen",
      "Voice recording transcripts",
    ],
    popular: true,
  },
  {
    tier:    "ultra" as PremiumTier,
    name:    "Ultra",
    price:   "$14.99",
    period:  "/month",
    tagline: "Unlimited intelligence",
    color1:  "#1a1000",
    color2:  "#7c5200",
    accent:  "#f59e0b",
    emoji:   "👑",
    features: [
      "Everything in Plus",
      "Unlimited messages",
      "🔒 Goal tracking on lock screen",
      "Stanbic Bank payments",
      "Custom AI fine-tuning",
      "1-on-1 onboarding call",
    ],
  },
] as const
