"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  ChevronLeft, Send, Mic, Camera, ScanLine, Paperclip,
  Loader2, Trash2, Sparkles, Zap, MonitorSmartphone, Brain,
} from "lucide-react"
import type { AppShared } from "./types"
import { cn } from "@/lib/utils"
import { getQuota, isPremium } from "@/lib/quota"

const SESSION_KEY = "lex-session-id-v1"
function getSessionId(): string {
  if (typeof window === "undefined") return "s0"
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) { id = `s${Date.now()}`; localStorage.setItem(SESSION_KEY, id) }
  return id
}

function StatusBar({ time }: { time: Date | null }) {
  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
  return (
    <div className="flex items-center justify-between px-6 pt-4 text-foreground">
      <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
      <span className="text-[11px] font-semibold text-primary">LEX AI</span>
    </div>
  )
}

function QuotaBar({ remaining, limit, onUpgrade }: { remaining: number; limit: number; onUpgrade: () => void }) {
  const pct     = Math.max(0, remaining / limit)
  const color   = pct > 0.4 ? "#22c55e" : pct > 0.15 ? "#f59e0b" : "#ef4444"
  const used    = limit - remaining
  const premium = isPremium()
  if (premium) return null
  return (
    <div className="mx-4 mb-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">
          {remaining === 0 ? "Daily limit reached" : `${used} of ${limit} free messages used`}
        </span>
        <button onClick={onUpgrade} className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:opacity-80 transition-opacity">
          <Sparkles className="size-3" /> Upgrade
        </button>
      </div>
      <div className="h-1 w-full rounded-full bg-accent/50 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(used / limit) * 100}%`, background: color }} />
      </div>
    </div>
  )
}

const QUICK = [
  "What do you know about me?",
  "Summarize my day",
  "Help me write a message",
  "What's trending?",
]

/* extract app name from transcribed voice command */
function parseVoiceCommand(text: string): { type: "open_app"; appName: string } | null {
  const t = text.toLowerCase().trim()
  const match = t.match(/^(?:open|launch|start|go to|navigate to)\s+(.+)$/i)
  if (match) return { type: "open_app", appName: match[1].trim() }
  return null
}

export function LexScreen({ goBack, time, messages, thinking, sendMessage, startVoice, navigate }: AppShared) {
  const [input, setInput]           = useState("")
  const [quota, setQuota]           = useState(() => getQuota())
  const [attachment, setAttachment] = useState<{ name: string; type: string } | null>(null)
  const [predictions, setPredictions] = useState<string[]>([])
  const [sessionId]                 = useState(() => getSessionId())
  const endRef                      = useRef<HTMLDivElement>(null)
  const cameraRef                   = useRef<HTMLInputElement>(null)
  const filesRef                    = useRef<HTMLInputElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, thinking])
  useEffect(() => { setQuota(getQuota()) }, [messages.length])

  /* load predictive suggestions */
  useEffect(() => {
    fetch("/api/analysis?userId=local&type=patterns")
      .then(r => r.json())
      .then(data => {
        const hour = new Date().getHours()
        const patterns: Array<{ action: string; count: number; hour_of_day: number }> = data.patterns ?? []
        const chatPatterns = patterns
          .filter(p => p.action.startsWith("chat:"))
          .sort((a, b) => {
            const hourDiff = Math.abs((a.hour_of_day ?? 12) - hour) - Math.abs((b.hour_of_day ?? 12) - hour)
            return hourDiff !== 0 ? hourDiff : b.count - a.count
          })
          .slice(0, 3)
          .map(p => p.action.replace("chat:", ""))
        if (chatPatterns.length > 0) setPredictions(chatPatterns)
      })
      .catch(() => {})
  }, [])

  function trackChatUsage(text: string) {
    const now = new Date()
    fetch("/api/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "local", type: "usage", action: `chat:${text.slice(0, 60)}`,
        hour_of_day: now.getHours(), day_of_week: now.getDay(),
      }),
    }).catch(() => {})
  }

  const extractMemory = useCallback(async (userMsg: string, assistantReply: string) => {
    fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: "local", userMessage: userMsg, assistantReply }),
    }).catch(() => {})
  }, [])

  const handleSend = async () => {
    const t = input.trim()
    if (!t && !attachment) return
    const msg = attachment ? `${t ? t + " " : ""}[${attachment.name}]` : t
    setInput("")
    setAttachment(null)
    trackChatUsage(msg)

    /* check for voice app commands typed */
    const cmd = parseVoiceCommand(msg)
    if (cmd?.type === "open_app") {
      navigate("drawer")
      setTimeout(() => window.dispatchEvent(new CustomEvent("lex-open-app", { detail: { appName: cmd.appName } })), 400)
      return
    }

    await sendMessage(msg)

    /* extract memory from the exchange async */
    const lastAssistant = messages.filter(m => m.role === "assistant").slice(-1)[0]
    if (lastAssistant) extractMemory(msg, lastAssistant.content)
  }

  const handleCamera = () => { cameraRef.current?.click() }
  const handleFiles  = () => { filesRef.current?.click() }

  const handleScreen = async () => {
    try {
      if (navigator.mediaDevices && "getDisplayMedia" in navigator.mediaDevices) {
        const stream = await (navigator.mediaDevices as MediaDevices & { getDisplayMedia: (c?: object) => Promise<MediaStream> }).getDisplayMedia({ video: true })
        const track  = stream.getVideoTracks()[0]
        track.stop()
        setAttachment({ name: "screenshot.png", type: "image/png" })
        sendMessage("I've shared my screen with you for context. What do you see? [screenshot.png]")
      } else {
        sendMessage("Screen sharing isn't available in this browser.")
      }
    } catch { sendMessage("Screen sharing was cancelled.") }
  }

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>, isCamera: boolean) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachment({ name: file.name, type: file.type })
    e.target.value = ""
    const label = isCamera ? `photo: ${file.name}` : `file: ${file.name}`
    sendMessage(`I'm sharing a ${label} with you. [${file.name}]`)
  }

  /* enhanced voice: parse command first, then send */
  const handleVoice = async () => {
    await startVoice()
  }

  const isLocked = quota.exhausted && !isPremium()

  return (
    <div className="flex h-full flex-col">
      <StatusBar time={time} />

      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-2">
        <button onClick={goBack} className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform">
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex flex-1 items-center gap-2">
          <Image src="/lex-orb.png" alt="LEX" width={32} height={32} className="rounded-full" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-primary">LEX</p>
            <p className="text-[10px] text-muted-foreground">
              {thinking ? "Thinking…" : isLocked ? "Upgrade to continue" : "Online · Ready to help"}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("memory")}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary transition-colors"
          title="Memory Tree"
        >
          <Brain className="size-4" />
        </button>
        {messages.length > 0 && (
          <button className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>

      <QuotaBar remaining={quota.remaining} limit={quota.limit} onUpgrade={() => navigate("paywall")} />

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.length === 0 && !thinking && (
          <div className="flex flex-col items-center py-6">
            <Image src="/lex-orb.png" alt="LEX" width={72} height={72} className="rounded-full shadow-lg" priority />
            <p className="mt-4 text-base font-semibold text-foreground">What can I do for you?</p>
            <p className="mt-1 text-xs text-muted-foreground">Type below, tap 🎙 to speak, or try:</p>

            {/* predictive suggestions or defaults */}
            <div className="mt-4 w-full space-y-1.5">
              {(predictions.length > 0 ? predictions : QUICK).map(q => (
                <button
                  key={q}
                  onClick={() => { trackChatUsage(q); sendMessage(q) }}
                  className="w-full rounded-2xl border border-border bg-card/80 px-4 py-2.5 text-xs text-foreground text-left hover:bg-accent/50 active:bg-accent transition-colors flex items-center gap-2"
                >
                  {predictions.length > 0 && <Sparkles className="size-3 text-primary/60 shrink-0" />}
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex items-end gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <Image src="/lex-orb.png" alt="LEX" width={24} height={24} className="rounded-full shrink-0 mb-0.5" />
            )}
            <div className={cn(
              "max-w-[78%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed",
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-popover border border-border/70 text-foreground rounded-bl-md shadow-sm",
            )}>
              {m.content}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex items-end gap-2">
            <Image src="/lex-orb.png" alt="LEX" width={24} height={24} className="rounded-full" />
            <div className="rounded-3xl rounded-bl-md border border-border/70 bg-popover px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => (
                  <span key={i} className="size-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${i * 160}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {isLocked && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 text-center">
              <Sparkles className="mx-auto size-7 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground">Daily limit reached</p>
              <p className="mt-0.5 text-xs text-muted-foreground">You've used all 10 free messages today. Upgrade for more.</p>
              <button onClick={() => navigate("paywall")} className="mt-3 flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md mx-auto active:scale-95 transition-transform">
                <Zap className="size-3.5" /> Upgrade LEX
              </button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleFileSelected(e, true)} />
      <input ref={filesRef}  type="file" accept="*/*" className="hidden" onChange={e => handleFileSelected(e, false)} />

      {/* input bar */}
      <div className="px-4 pb-3">
        {isLocked ? (
          <button onClick={() => navigate("paywall")} className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-3 text-sm font-semibold text-primary active:scale-[0.98] transition-transform">
            <Sparkles className="size-4" /> Upgrade for unlimited messages
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-3xl border border-border bg-card px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={handleVoice} title="Voice" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent/60 active:scale-90 transition-all">
                <Mic className="size-4" />
              </button>
              <button onClick={handleCamera} title="Camera" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent/60 active:scale-90 transition-all">
                <Camera className="size-4" />
              </button>
              <button onClick={handleScreen} title="Share screen" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent/60 active:scale-90 transition-all">
                <MonitorSmartphone className="size-4" />
              </button>
              <button onClick={handleFiles} title="Attach file" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent/60 active:scale-90 transition-all">
                <Paperclip className="size-4" />
              </button>
            </div>
            <div className="h-5 w-px bg-border/60 shrink-0" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={attachment ? `+ ${attachment.name}` : "Message LEX…"}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSend}
              disabled={thinking || (!input.trim() && !attachment)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm active:scale-90 transition-transform disabled:opacity-40"
            >
              {thinking ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
