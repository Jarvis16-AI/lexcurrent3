import { NextResponse } from "next/server"
import { PLANS } from "@/lib/stanbic"

export async function GET() {
  return NextResponse.json({
    plans: Object.values(PLANS),
    provider: "Stanbic Bank",
    currency: "ZMW",
    features: {
      free: ["5 AI conversations/day", "Basic voice commands", "Standard response time"],
      pro_plus: PLANS.pro_plus.features,
      ultra: PLANS.ultra.features,
    },
  })
}
