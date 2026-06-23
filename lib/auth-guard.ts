/**
 * Centralized auth guard for all API routes.
 *
 * Rules:
 * - NEVER trust userId from request body or query params.
 * - Always derive the authenticated identity from the Clerk session.
 * - Use requireAuth() at the top of every API handler that touches user data.
 */

import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

type AuthOk  = { userId: string; error?: never }
type AuthErr = { userId?: never; error: NextResponse }

/**
 * Verify Clerk session and return the authenticated userId.
 * Returns a 401 NextResponse in the `error` field if not authenticated.
 *
 * Usage:
 *   const { userId, error } = await requireAuth()
 *   if (error) return error
 *   // userId is now safe to use as the data partition key
 */
export async function requireAuth(): Promise<AuthOk | AuthErr> {
  try {
    const { userId } = await auth()
    if (!userId) {
      console.warn("[auth-guard] Unauthenticated request rejected")
      return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
    }
    return { userId }
  } catch (e) {
    console.error("[auth-guard] Auth check failed:", e)
    return { error: NextResponse.json({ error: "Authentication error" }, { status: 401 }) }
  }
}

/**
 * Look up the authenticated user's actual subscription tier from the database.
 * NEVER trust the tier value from the client request body.
 *
 * Returns "free" if no active subscription found, or if the DB lookup fails.
 */
export async function getVerifiedUserTier(
  clerkId: string
): Promise<"free" | "pro" | "plus" | "ultra"> {
  try {
    const row = await queryOne<{ plan: string }>(
      `SELECT plan FROM users WHERE clerk_id = $1`,
      [clerkId]
    )
    const plan = row?.plan?.toLowerCase() ?? "free"
    if (plan === "pro" || plan === "plus" || plan === "ultra") return plan
    return "free"
  } catch (e) {
    console.error("[auth-guard] Tier lookup failed:", e)
    return "free"
  }
}

/**
 * Require a valid admin secret key in the X-Admin-Key request header.
 * Returns a 403 NextResponse if the key is missing or wrong.
 * Returns null if the key is valid.
 *
 * Set ADMIN_SECRET_KEY in environment variables to enable admin endpoints.
 */
export function requireAdminKey(req: Request): NextResponse | null {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) {
    console.warn("[auth-guard] ADMIN_SECRET_KEY not set — admin endpoint blocked")
    return NextResponse.json(
      { error: "Admin access not configured on this server" },
      { status: 503 }
    )
  }
  const provided = req.headers.get("x-admin-key") ?? ""
  if (provided !== secret) {
    console.warn("[auth-guard] Invalid admin key attempt")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  return null
}
