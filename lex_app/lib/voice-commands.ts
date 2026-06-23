import type { Screen } from "@/components/lex/app/types"

/* ── Types ───────────────────────────────────────────────────────────── */
export type VoiceCommandAction =
  | { type: "navigate";      screen: Screen }
  | { type: "go_back" }
  | { type: "set_wallpaper"; color: string; label: string }
  | { type: "toggle_focus";  enable: boolean }
  | { type: "toggle_dnd";    enable: boolean }
  | { type: "stop_tts" }
  | { type: "open_lex_chat" }
  | { type: "chat_message";  text: string }
  | { type: "none";          raw: string }

/* ── Colour map ──────────────────────────────────────────────────────── */
const COLORS: Record<string, { hex: string; gradient: string }> = {
  blue:    { hex: "#1d4ed8", gradient: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 100%)" },
  red:     { hex: "#dc2626", gradient: "linear-gradient(135deg,#7f1d1d 0%,#dc2626 100%)" },
  green:   { hex: "#16a34a", gradient: "linear-gradient(135deg,#14532d 0%,#16a34a 100%)" },
  purple:  { hex: "#7c3aed", gradient: "linear-gradient(135deg,#3b0764 0%,#7c3aed 100%)" },
  orange:  { hex: "#ea580c", gradient: "linear-gradient(135deg,#7c2d12 0%,#ea580c 100%)" },
  pink:    { hex: "#db2777", gradient: "linear-gradient(135deg,#831843 0%,#db2777 100%)" },
  yellow:  { hex: "#ca8a04", gradient: "linear-gradient(135deg,#713f12 0%,#ca8a04 100%)" },
  black:   { hex: "#0a0a0a", gradient: "linear-gradient(135deg,#0a0a0a 0%,#171717 100%)" },
  white:   { hex: "#fafafa", gradient: "linear-gradient(135deg,#e5e7eb 0%,#fafafa 100%)" },
  gray:    { hex: "#6b7280", gradient: "linear-gradient(135deg,#111827 0%,#374151 100%)" },
  dark:    { hex: "#1c1917", gradient: "linear-gradient(135deg,#0c0a09 0%,#1c1917 100%)" },
  teal:    { hex: "#0d9488", gradient: "linear-gradient(135deg,#134e4a 0%,#0d9488 100%)" },
  indigo:  { hex: "#4338ca", gradient: "linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%)" },
  cyan:    { hex: "#0891b2", gradient: "linear-gradient(135deg,#083344 0%,#0891b2 100%)" },
  emerald: { hex: "#059669", gradient: "linear-gradient(135deg,#064e3b 0%,#059669 100%)" },
  violet:  { hex: "#7c3aed", gradient: "linear-gradient(135deg,#2e1065 0%,#6d28d9 100%)" },
  amber:   { hex: "#d97706", gradient: "linear-gradient(135deg,#78350f 0%,#d97706 100%)" },
  rose:    { hex: "#e11d48", gradient: "linear-gradient(135deg,#4c0519 0%,#e11d48 100%)" },
  navy:    { hex: "#1e3a8a", gradient: "linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%)" },
}

/* ── Screen aliases ──────────────────────────────────────────────────── */
const SCREEN_MAP: Record<string, Screen> = {
  home: "home", main: "home",
  chat: "lex",  lex: "lex", "ai chat": "lex", "ai": "lex",
  focus: "focus", "focus mode": "focus",
  settings: "settings", setting: "settings",
  space: "space", "lex space": "space",
  drawer: "drawer", apps: "drawer", "app drawer": "drawer",
  memory: "memory", "memory tree": "memory",
  analysis: "analysis", stats: "analysis", "usage": "analysis",
  search: "search",
  emergency: "emergency", sos: "emergency",
  paywall: "paywall", premium: "paywall", upgrade: "paywall",
}

/* ── Parser ──────────────────────────────────────────────────────────── */
export function parseVoiceCommand(text: string): VoiceCommandAction {
  const t = text.toLowerCase().trim()

  /* go back */
  if (/\b(go back|back|previous|return)\b/.test(t)) return { type: "go_back" }

  /* stop TTS */
  if (/\b(stop(?: speaking)?|mute|quiet|silence|stop talking|be quiet|shush)\b/.test(t)) {
    return { type: "stop_tts" }
  }

  /* set wallpaper / background color */
  const wallMatch = t.match(/(?:set|change)\s+(?:wallpaper|background|theme|color|colour)\s+(?:to\s+)?(\w+)/)
  if (wallMatch) {
    const name = wallMatch[1]
    const c    = COLORS[name]
    if (c) return { type: "set_wallpaper", color: c.gradient, label: name }
  }

  /* enable / disable focus mode */
  if (/\b(enable|turn on|start|activate)\s+focus/.test(t))  return { type: "toggle_focus", enable: true  }
  if (/\b(disable|turn off|stop|deactivate)\s+focus/.test(t)) return { type: "toggle_focus", enable: false }

  /* enable / disable do not disturb */
  if (/\b(enable|turn on)\s+(do not disturb|dnd)\b/.test(t))  return { type: "toggle_dnd", enable: true  }
  if (/\b(disable|turn off)\s+(do not disturb|dnd)\b/.test(t)) return { type: "toggle_dnd", enable: false }

  /* open / navigate to [screen] */
  const navMatch = t.match(/^(?:open|go to|navigate to|launch|show|switch to|take me to)\s+(.+)$/)
  if (navMatch) {
    const target = navMatch[1].replace(/\s+page|screen$/, "").trim()
    const scr    = SCREEN_MAP[target]
    if (scr) return { type: "navigate", screen: scr }
  }

  /* just a screen name on its own */
  const scr = SCREEN_MAP[t]
  if (scr) return { type: "navigate", screen: scr }

  /* "ask lex / tell lex …" → route as chat message */
  const lexMsg = t.match(/^(?:ask lex|tell lex|hey lex)\s+(.+)$/)
  if (lexMsg) return { type: "chat_message", text: lexMsg[1] }

  return { type: "none", raw: text }
}

/* ── SpeechRecognition singleton ────────────────────────────────────── */
type OnResult   = (action: VoiceCommandAction, raw: string) => void
type OnListening = (listening: boolean) => void

let recognition:   SpeechRecognition | null = null
let _onResult:     OnResult | null          = null
let _onListening:  OnListening | null       = null
let _listening     = false

function getSR(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null
  return (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
      ?? (window as Window & { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? null
}

export function startGlobalVoiceCommand(onResult: OnResult, onListening?: OnListening) {
  const SR = getSR()
  if (!SR) { console.warn("[voice-commands] SpeechRecognition not supported"); return false }

  stopGlobalVoiceCommand()
  _onResult    = onResult
  _onListening = onListening ?? null

  recognition = new SR()
  recognition.continuous      = false
  recognition.interimResults  = false
  recognition.lang            = "en-US"
  recognition.maxAlternatives = 1

  recognition.onstart  = () => { _listening = true;  _onListening?.(true) }
  recognition.onend    = () => { _listening = false; _onListening?.(false) }
  recognition.onerror  = () => { _listening = false; _onListening?.(false) }

  recognition.onresult = (e) => {
    const raw = e.results[0]?.[0]?.transcript?.trim() ?? ""
    if (!raw) return
    _onResult?.(parseVoiceCommand(raw), raw)
  }

  try { recognition.start(); return true }
  catch { return false }
}

export function stopGlobalVoiceCommand() {
  try { recognition?.stop() } catch {}
  recognition = null
  _listening  = false
  _onListening?.(false)
}

export function isVoiceCommandListening() { return _listening }

/* ── Continuous conversation STT (for lex-chat voice mode) ─────────── */
let convoRec: SpeechRecognition | null = null

export function startConvoSTT(
  onTranscript: (text: string, isFinal: boolean) => void,
  onEnd: () => void,
): boolean {
  const SR = getSR()
  if (!SR) return false
  stopConvoSTT()

  convoRec = new SR()
  convoRec.continuous     = false
  convoRec.interimResults = true
  convoRec.lang           = "en-US"

  convoRec.onresult = (e) => {
    const last   = e.results[e.results.length - 1]
    const text   = last[0]?.transcript ?? ""
    const isFinal = last.isFinal
    onTranscript(text, isFinal)
  }
  convoRec.onend   = () => onEnd()
  convoRec.onerror = () => onEnd()

  try { convoRec.start(); return true }
  catch { return false }
}

export function stopConvoSTT() {
  try { convoRec?.stop() } catch {}
  convoRec = null
}
