import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import type { StanbicWebhookPayload } from "@/lib/stanbic"

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-stanbic-signature")
    const webhookSecret = process.env.STANBIC_WEBHOOK_SECRET

    if (webhookSecret && signature !== webhookSecret) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const payload = (await req.json()) as StanbicWebhookPayload
    const { reference, status, amount } = payload

    if (!reference || !status) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    if (status === "success") {
      await query(
        `UPDATE subscriptions
         SET status = 'active', amount = $1, started_at = $2, expires_at = $3, updated_at = $2
         WHERE stanbic_reference = $4`,
        [amount, now.toISOString(), expiresAt.toISOString(), reference]
      )

      const sub = await query<{ user_id: number; plan: string }>(
        "SELECT user_id, plan FROM subscriptions WHERE stanbic_reference = $1",
        [reference]
      )

      if (sub[0]) {
        await query(
          "UPDATE users SET plan = $1, updated_at = $2 WHERE id = $3",
          [sub[0].plan, now.toISOString(), sub[0].user_id]
        )
      }
    } else if (status === "failed" || status === "cancelled") {
      await query(
        "UPDATE subscriptions SET status = $1, updated_at = $2 WHERE stanbic_reference = $3",
        [status, now.toISOString(), reference]
      )
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[payments/webhook] error:", err)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
