"use client"

export type LockType = "pin" | "pattern" | "password" | "face" | "none"

export interface LockConfig {
  isSetup: boolean
  lockType: LockType
  lockHash: string
  recoveryEmail: string
  googleLinked: boolean
  faceCredentialId?: string
}

const KEY = "lex-lock-v1"

export function getLockConfig(): LockConfig | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LockConfig) : null
  } catch {
    return null
  }
}

export function setLockConfig(cfg: LockConfig) {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function clearLockConfig() {
  localStorage.removeItem(KEY)
}

export async function hashStr(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const buf  = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function verifyHash(value: string, stored: string): Promise<boolean> {
  return (await hashStr(value)) === stored
}
