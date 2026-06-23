import { NextRequest, NextResponse } from "next/server"
import { auth, currentUser } from "@clerk/nextjs/server"
import { query, queryOne } from "@/lib/db"

interface DbUser {
  id:         number
  clerk_id:   string
  email:      string
  name:       string | null
  plan:       string
  created_at: string
  updated_at: string
}

/* Ensure users table has clerk_id column */
async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      email      TEXT UNIQUE NOT NULL,
      name       TEXT,
      plan       TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  /* Add clerk_id column if missing (idempotent) */
  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE
  `).catch(() => {})
}

/* POST /api/user/sync — called client-side when Clerk session is present */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "Could not load user" }, { status: 400 })
    }

    await ensureSchema()

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? `${userId}@clerk.local`
    const name  = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || null

    /* Upsert by clerk_id first, fall back to email */
    const existing = await queryOne<DbUser>(
      `SELECT * FROM users WHERE clerk_id = $1 OR email = $2 LIMIT 1`,
      [userId, email]
    )

    let user: DbUser
    if (existing) {
      /* Update clerk_id, name, email in case they changed */
      const rows = await query<DbUser>(
        `UPDATE users
         SET clerk_id  = $1,
             email     = $2,
             name      = COALESCE($3, name),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [userId, email, name, existing.id]
      )
      user = rows[0]
    } else {
      /* Create new user */
      const rows = await query<DbUser>(
        `INSERT INTO users (clerk_id, email, name, plan)
         VALUES ($1, $2, $3, 'free')
         ON CONFLICT (email) DO UPDATE
           SET clerk_id = EXCLUDED.clerk_id, name = COALESCE(EXCLUDED.name, users.name), updated_at = NOW()
         RETURNING *`,
        [userId, email, name]
      )
      user = rows[0]
    }

    return NextResponse.json({ ok: true, user })
  } catch (err) {
    console.error("[user/sync]", err)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}

/* GET /api/user/sync — fetch current user's DB record */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    await ensureSchema()

    const user = await queryOne<DbUser>(
      `SELECT * FROM users WHERE clerk_id = $1`,
      [userId]
    )

    return NextResponse.json({ user: user ?? null })
  } catch (err) {
    console.error("[user/sync/get]", err)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}
