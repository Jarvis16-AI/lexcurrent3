/**
 * In-memory sliding-window token-bucket rate limiter.
 *
 * Per-process — resets on server restart.
 * For production at scale, replace the Map store with a Redis/Upstash backend.
 *
 * Usage:
 *   const ip = getClientIp(req)
 *   if (!chatLimiter.allow(ip)) return rateLimitedResponse()
 */

import { NextResponse } from "next/server"

interface Bucket {
  tokens: number
  lastRefill: number
}

class RateLimiter {
  private readonly store = new Map<string, Bucket>()

  constructor(
    private readonly burst: number,      // max burst allowed
    private readonly ratePerSec: number  // tokens refilled per second
  ) {}

  /** Returns true if the request is within rate limits; false if it should be blocked. */
  allow(key: string, cost = 1): boolean {
    const now = Date.now()
    let b = this.store.get(key)

    if (!b) {
      b = { tokens: this.burst, lastRefill: now }
    } else {
      const elapsed = (now - b.lastRefill) / 1000
      b.tokens = Math.min(this.burst, b.tokens + elapsed * this.ratePerSec)
      b.lastRefill = now
    }

    if (b.tokens < cost) {
      this.store.set(key, b)
      return false
    }

    b.tokens -= cost
    this.store.set(key, b)
    return true
  }

  /** Estimate seconds until the bucket refills enough for `cost` tokens. */
  retryAfter(key: string, cost = 1): number {
    const b = this.store.get(key)
    if (!b) return 0
    const deficit = cost - b.tokens
    if (deficit <= 0) return 0
    return Math.ceil(deficit / this.ratePerSec)
  }
}

/* ── Limiter instances ─────────────────────────────────────────────── */
/* Each represents a different risk surface and cost profile           */

/** AI chat — 30 burst, then 1 per 2 seconds per key */
export const chatLimiter = new RateLimiter(30, 0.5)

/** Voice TTS — 10 burst, then 1 per 10 seconds per key */
export const voiceLimiter = new RateLimiter(10, 0.1)

/** Whisper transcription — 5 burst, then 1 per 20 seconds per key */
export const transcribeLimiter = new RateLimiter(5, 0.05)

/** Memory writes — 20 burst, then 1 per second per key */
export const memoryLimiter = new RateLimiter(20, 1)

/** Bypass code redemption — 5 attempts per hour (brute-force prevention) */
export const bypassLimiter = new RateLimiter(5, 0.0014) // 5 burst, ~1 per 12 min

/** General API — 60 burst, 2 per second (light protection for misc routes) */
export const apiLimiter = new RateLimiter(60, 2)

/** Vision / image analysis — 10 burst, then 1 per 5 seconds per key */
export const visionLimiter = new RateLimiter(10, 0.2)

/* ── Helpers ───────────────────────────────────────────────────────── */

/** Extract the real client IP, preferring the first forwarded address. */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

/** Standard 429 Too Many Requests response. */
export function rateLimitedResponse(retryAfterSec = 30): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + retryAfterSec),
      },
    }
  )
}
