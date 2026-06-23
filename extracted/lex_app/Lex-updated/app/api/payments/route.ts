import { NextRequest, NextResponse } from "next/server"
import { PLANS, initiateStanbicPayment, verifyStanbicPayment, type PlanId } from "@/lib/stanbic"
import { query, queryOne } from "@/lib/db"

export async function GET() {
  return NextResponse.json({
    plans: Object.values(PLANS),
    currency: "ZMW",
    provider: "Stanbic Bank",
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { planId, email, userId, phone } = body as {
      planId: PlanId
      email: string
      userId?: number
      phone?: string
    }

    if (!planId || !email) {
      return NextResponse.json({ error: "planId and email are required" }, { status: 400 })
    }

    if (!PLANS[planId]) {
      return NextResponse.json({ error: `Invalid plan. Choose: ${Object.keys(PLANS).join(", ")}` }, { status: 400 })
    }

    let resolvedUserId = userId
    if (email && !resolvedUserId) {
      const user = await queryOne<{ id: number }>(
        "SELECT id FROM users WHERE email = $1",
        [email]
      )
      if (user) resolvedUserId = user.id
    }

    const payment = await initiateStanbicPayment({
      planId,
      userId: resolvedUserId ?? 0,
      email,
      phone,
    })

    if (resolvedUserId) {
      await query(
        `INSERT INTO subscriptions (user_id, plan, status, stanbic_reference, amount, currency)
         VALUES ($1, $2, 'pending', $3, $4, $5)`,
        [resolvedUserId, planId, payment.reference, payment.amount, payment.currency]
      )
    }

    return NextResponse.json({
      reference: payment.reference,
      redirectUrl: payment.redirectUrl,
      amount: payment.amount,
      currency: payment.currency,
      plan: PLANS[planId],
    })
  } catch (err) {
    console.error("[payments] error:", err)
    return NextResponse.json({ error: "Payment initiation failed" }, { status: 500 })
  }
}
