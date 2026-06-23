/**
 * Developer role system — Section 11 of the Production-Scale directive.
 *
 * The Developer role is assigned by Clerk User ID ONLY.
 * Never trust email. Never trust frontend state.
 *
 * Configure in environment:
 *   DEVELOPER_USER_IDS=user_abc123,user_def456
 *
 * Server-side only — never expose to frontend.
 */

function getDeveloperIds(): Set<string> {
  const raw = process.env.DEVELOPER_USER_IDS ?? ""
  return new Set(
    raw.split(",").map(s => s.trim()).filter(Boolean)
  )
}

export function isDeveloper(clerkUserId: string): boolean {
  if (!clerkUserId) return false
  return getDeveloperIds().has(clerkUserId)
}

export function requireDeveloper(clerkUserId: string): boolean {
  return isDeveloper(clerkUserId)
}
