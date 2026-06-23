export const PLANS = {
  pro_plus: {
    id: "pro_plus",
    name: "Pro Plus",
    price: 49.99,
    currency: "ZMW",
    features: [
      "Unlimited AI conversations",
      "Priority voice responses",
      "Advanced context awareness",
      "Background auto-assist",
      "5 voice profiles",
    ],
  },
  ultra: {
    id: "ultra",
    name: "Ultra",
    price: 99.99,
    currency: "ZMW",
    features: [
      "Everything in Pro Plus",
      "Custom voice cloning",
      "Unlimited voice sessions",
      "Multi-device sync",
      "Priority support",
      "Early access to new features",
    ],
  },
} as const

export type PlanId = keyof typeof PLANS

export interface StanbicPaymentInit {
  planId: PlanId
  userId: number
  email: string
  phone?: string
}

export interface StanbicPaymentResult {
  reference: string
  redirectUrl: string
  status: "pending" | "failed"
  amount: number
  currency: string
}

export interface StanbicWebhookPayload {
  reference: string
  status: "success" | "failed" | "cancelled"
  amount: number
  currency: string
  timestamp: string
}

export async function initiateStanbicPayment(
  payload: StanbicPaymentInit
): Promise<StanbicPaymentResult> {
  const plan = PLANS[payload.planId]
  if (!plan) throw new Error(`Invalid plan: ${payload.planId}`)

  const reference = `LEX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

  const stanbicApiUrl = process.env.STANBIC_API_URL
  const stanbicApiKey = process.env.STANBIC_API_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN}`

  if (!stanbicApiUrl || !stanbicApiKey) {
    return {
      reference,
      redirectUrl: `${appUrl}/payment/pending?ref=${reference}&plan=${payload.planId}`,
      status: "pending",
      amount: plan.price,
      currency: plan.currency,
    }
  }

  const res = await fetch(`${stanbicApiUrl}/v1/payments/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stanbicApiKey}`,
    },
    body: JSON.stringify({
      reference,
      amount: plan.price,
      currency: plan.currency,
      description: `LEX ${plan.name} Subscription`,
      customer: { email: payload.email, phone: payload.phone },
      callback_url: `${appUrl}/api/payments/webhook`,
      return_url: `${appUrl}/payment/success?ref=${reference}`,
    }),
  })

  if (!res.ok) {
    throw new Error(`Stanbic payment initiation failed: ${res.status}`)
  }

  const data = await res.json()

  return {
    reference,
    redirectUrl: data.payment_url ?? `${appUrl}/payment/pending?ref=${reference}`,
    status: "pending",
    amount: plan.price,
    currency: plan.currency,
  }
}

export async function verifyStanbicPayment(reference: string): Promise<{
  status: "success" | "failed" | "pending"
  amount?: number
}> {
  const stanbicApiUrl = process.env.STANBIC_API_URL
  const stanbicApiKey = process.env.STANBIC_API_KEY

  if (!stanbicApiUrl || !stanbicApiKey) {
    return { status: "pending" }
  }

  const res = await fetch(`${stanbicApiUrl}/v1/payments/${reference}`, {
    headers: { Authorization: `Bearer ${stanbicApiKey}` },
  })

  if (!res.ok) return { status: "failed" }

  const data = await res.json()
  return { status: data.status, amount: data.amount }
}
