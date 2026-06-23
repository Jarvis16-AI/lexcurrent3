import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"
import { requireAuth } from "@/lib/auth-guard"

interface User {
  id: number
  clerk_id: string | null
  email: string
  name: string | null
  plan: string
  created_at: string
  updated_at: string
}

interface Subscription {
  id: number
  plan: string
  status: string
  amount: number
  currency: string
  started_at: string | null
  expires_at: string | null
}

/* GET /api/user — fetch own profile + subscriptions */
export async function GET(_req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  const user = await queryOne<User>(
    "SELECT id, clerk_id, email, name, plan, created_at, updated_at FROM users WHERE clerk_id = $1",
    [userId]
  )

  if (!user) {
    return NextResponse.json({ error: "User not found — call /api/user/sync first" }, { status: 404 })
  }

  const subscriptions = await query<Subscription>(
    "SELECT id, plan, status, amount, currency, started_at, expires_at FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  )

  /* Never return clerk_id or internal DB id to the client */
  const { id: _id, clerk_id: _cid, ...safeUser } = user
  return NextResponse.json({ user: safeUser, subscriptions })
}

/* PATCH /api/user — update own profile (name only) */
export async function PATCH(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  try {
    const body  = await req.json()
    const { name } = body as { name?: string }

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const rows = await query<User>(
      `UPDATE users SET name = $1, updated_at = NOW()
       WHERE clerk_id = $2
       RETURNING id, email, name, plan, created_at, updated_at`,
      [name.trim().slice(0, 100), userId]
    )

    if (!rows[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: rows[0] })
  } catch (err) {
    console.error("[user/update] error:", err)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

/* POST is removed — user creation is handled exclusively via /api/user/sync (Clerk webhook) */
export async function POST() {
  return NextResponse.json(
    { error: "Use /api/user/sync for account setup" },
    { status: 405 }
  )
}
