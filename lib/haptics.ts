"use client"

export type HapticPattern = "tap" | "select" | "success" | "warning" | "error" | "heavy" | "navigate"

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap:      10,
  select:   5,
  navigate: [6, 30, 8],
  success:  [10, 60, 20],
  warning:  [20, 50, 20],
  error:    [40, 50, 40, 50, 40],
  heavy:    60,
}

export function haptic(pattern: HapticPattern = "tap") {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return
  try { navigator.vibrate(PATTERNS[pattern]) } catch { /* unsupported */ }
}
