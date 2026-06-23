import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-guard"
import { isDeveloper } from "@/lib/developer"

export async function GET() {
  const { userId, error } = await requireAuth()
  if (error) return error

  return NextResponse.json({
    isDeveloper: isDeveloper(userId),
    userId,
  })
}
