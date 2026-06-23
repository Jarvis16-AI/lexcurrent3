import { NextRequest, NextResponse } from "next/server"
import { PLANS, initiateStanbicPayment, type PlanId } from "@/lib/stanbic"
import { query, queryOne } from "@/lib/db"
import { requireAuth } from "@/lib/auth-guard"
import { apiLimiter, getClientIp, rateLimitedResponse } from "@/lib/rate-limit"

/* GET /api/payments — list available plans (public, no auth needed) */
export async function GET() {
  return NextResponse.json({
    plans:    Object.values(PLANS),
    currency: "ZMW",
    provider: "Stanbic Bank",
  })
}

/* POST /api/payments — initiate a payment for the authenticated user */
export async function POST(req: NextRequest) {
  const { userId, error } = await requireAuth()
  if (error) return error

  /* Rate-limit payment initiations: 5 burst, 1 per 10s per user */
  const ip  = getClientIp(req)
  if (!apiLimiter.allow(`payment:${userId}:${ip}`)) return rateLimitedResponse(60)

  try {
    const body = await req.json()
    const { planId, phone } = body as { planId: PlanId; phone?: string }

    if (!planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 })
    }
    if (!PLANS[planId]) {
      return NextResponse.json(
        { error: `Invalid plan. Choose: ${Object.keys(PLANS).join(", ")}` },
        { status: 400 }
      )
    }

    /* Look up the user's own DB record — never trust userId from request body */
    const user = await queryOne<{ id: number; email: string }>(
      "SELECT id, email FROM users WHERE clerk_id = $1",
      [userId]
    )
    if (!user) {
      return NextResponse.json(
        { error: "Account not found. Please sign out and sign in again." },
        { status: 404 }
      )
    }

    const payment = await initiateStanbicPayment({
      planId,
      userId: user.id,
      email:  user.email,
      phone,
    })

    await query(
      `INSERT INTO subscriptions (user_id, plan, status, stanbic_reference, amount, currency)
       VALUES ($1, $2, 'pending', $3, $4, $5)`,
      [user.id, planId, payment.reference, payment.amount, payment.currency]
    )

    return NextResponse.json({
      reference:   payment.reference,
      redirectUrl: payment.redirectUrl,
      amount:      payment.amount,
      currency:    payment.currency,
      plan:        PLANS[planId],
    })
  } catch (err) {
    console.error("[payments] error:", err)
    return NextResponse.json({ error: "Payment initiation failed" }, { status: 500 })
  }
}
