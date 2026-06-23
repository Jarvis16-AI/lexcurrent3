import { NextRequest, NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

interface User {
  id: number
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

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")
  const id = req.nextUrl.searchParams.get("id")

  if (!email && !id) {
    return NextResponse.json({ error: "email or id is required" }, { status: 400 })
  }

  const user = id
    ? await queryOne<User>("SELECT * FROM users WHERE id = $1", [Number(id)])
    : await queryOne<User>("SELECT * FROM users WHERE email = $1", [email!])

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const subscriptions = await query<Subscription>(
    "SELECT id, plan, status, amount, currency, started_at, expires_at FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  )

  return NextResponse.json({ user, subscriptions })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name } = body as { email: string; name?: string }

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    const existing = await queryOne<User>("SELECT * FROM users WHERE email = $1", [email])
    if (existing) {
      return NextResponse.json({ user: existing, created: false })
    }

    const rows = await query<User>(
      "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *",
      [email, name ?? null]
    )

    return NextResponse.json({ user: rows[0], created: true }, { status: 201 })
  } catch (err) {
    console.error("[user/create] error:", err)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name } = body as { id: number; name: string }

    if (!id || !name) {
      return NextResponse.json({ error: "id and name are required" }, { status: 400 })
    }

    const rows = await query<User>(
      "UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [name, id]
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
