---
name: LEX Quota & Paywall
description: Free tier message limiting, paywall slides, and Stanbic payment screen
---

## Quota system (lib/quota.ts)
- Free daily limit: `FREE_DAILY_LIMIT = 10` messages/day
- Stored in localStorage `lex-quota-v1` as `{ date: "YYYY-MM-DD", count: number }`
- Key functions: `getQuota()`, `incrementQuota()`, `isPremium()`, `getPremiumTier()`, `setPremium(tier, days)`, `clearPremium()`
- Premium stored in `lex-premium-v1` as `{ tier, until: epochMs }`
- `PLANS` array in `lib/quota.ts` is the single source of truth for plan metadata (prices in K and USD, features, colors, emoji)

## Quota check flow (index.tsx sendMessage)
1. `if (!isPremium()) { const q = getQuota(); if (q.exhausted) { navigate("paywall"); return } }`
2. After user message added to state: `incrementQuota()`
3. Quota is checked BEFORE the API call to protect Groq quota

## Paywall screen (components/lex/app/paywall.tsx)
- Full dark screen with animated ambient glow that changes color per plan
- 3 swipeable plan cards (touch + arrow nav): Pro (blue), Plus (purple, popular), Ultra (gold)
- Dots navigation with active pill indicator
- Plan cards: price in Kwacha + USD equivalent, feature list with check icons, CTA button
- "Continue Free" link at bottom

## Payment screen (components/lex/app/payment.tsx)
- Stanbic Bank Zambia branding (navy #003087 + plan accent)
- Shows selected plan summary card with gradient matching plan colors
- Form: Full name + phone number (card/bank details TODO when Stanbic API added)
- Shows integration-in-progress amber notice
- On submit: calls `setPremium(tier, 30)` locally, redirects to home after 2s success animation

## Lex chat quota UI (lex-chat.tsx)
- `QuotaBar` component: thin progress bar + "X of 10 free messages used" + Upgrade link
- When exhausted: input bar replaced with full-width "Upgrade" button, inline paywall banner in messages
- QuotaBar hidden for premium users

**Why:** Quota is client-side only (localStorage) — it's a soft limit to protect API costs, not a hard security boundary. Server-side enforcement can be added later with DB-backed sessions.
