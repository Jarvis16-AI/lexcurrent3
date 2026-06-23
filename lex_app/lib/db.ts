import { Pool } from "pg"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

export async function query<T = unknown>(
  text: string,
  params?: (string | number | boolean | null)[]
): Promise<T[]> {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return res.rows as T[]
  } finally {
    client.release()
  }
}

export async function queryOne<T = unknown>(
  text: string,
  params?: (string | number | boolean | null)[]
): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] ?? null
}

export { pool }
