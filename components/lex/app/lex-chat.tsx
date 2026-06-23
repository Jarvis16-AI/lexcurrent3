"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  ChevronLeft, Send, Mic, Camera, Paperclip,
  Loader2, Trash2, Sparkles, Zap, MonitorSmartphone, Brain,
  FileText, Headphones, Video, X, Square, VolumeX, Mic2,
} from "lucide-react"
import type { AppShared } from "./types"
import { cn } from "@/lib/utils"
import { getQuota, isPremium } from "@/lib/quota"
import { startConvoSTT, stopConvoSTT } from "@/lib/voice-commands"
import { useToast } from "@/components/ui/toast"
import { ChunkProgress } from "@/components/ui/progress"
import { Markdown as MarkdownMsg } from "@/components/ui/markdown"

const MAX_FILE_BYTES = 25 * 1024 * 1024  // 25 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024 // 100 MB

/* ── Session ─────────────────────────────────────────────────────── */
const SESSION_KEY = "lex-session-id-v1"
function getSessionId(): string {
  if (typeof window === "undefined") return "s0"
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) { id = `s${Date.now()}`; localStorage.setItem(SESSION_KEY, id) }
  return id
}

/* ── Attachment ──────────────────────────────────────────────────── */
type AttachmentKind = "image" | "pdf" | "audio" | "video"
interface Attachment { file: File; kind: AttachmentKind; preview: string }

/* ── Media helpers ───────────────────────────────────────────────── */
async function analyzeImage(file: File, prompt?: string): Promise<string> {
  const fd = new FormData()
  fd.append("image", file)
  fd.append("prompt", prompt ?? "Describe this image in detail. Be specific and helpful.")
  const res  = await fetch("/api/vision", { method: "POST", body: fd })
  const data = await res.json() as { description?: string }
  return data.description ?? "I couldn't analyze this image."
}

async function transcribeAudio(file: File): Promise<string> {
  const fd = new FormData()
  fd.append("audio", file)
  const res  = await fetch("/api/transcribe", { method: "POST", body: fd })
  const data = await res.json() as { transcript?: string }
  return data.transcript ?? "I couldn't transcribe this audio."
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist")
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`
    }
    const data  = await file.arrayBuffer()
    const doc   = await pdfjsLib.getDocument({ data }).promise
    const n     = Math.min(doc.numPages, 25)
    const pages = await Promise.all(
      Array.from({ length: n }, (_, i) =>
        doc.getPage(i + 1)
          .then(p => p.getTextContent())
          .then(tc => tc.items.map(it => ("str" in it ? (it as { str: string }).str : "")).join(" "))
      )
    )
    const text = pages.join("\n\n").trim()
    return text.slice(0, 8000) || "No readable text found in this PDF."
  } catch { return "Could not extract text from this PDF." }
}

async function extractVideoFrame(file: File): Promise<Blob | null> {
  return new Promise(resolve => {
    const video = document.createElement("video")
    video.preload = "metadata"
    const url = URL.createObjectURL(file)
    video.src = url
    video.onloadedmetadata = () => { video.currentTime = Math.min(video.duration * 0.25, 5) }
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = 640; canvas.height = 360
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        canvas.toBlob(b => resolve(b), "image/jpeg", 0.8)
      } catch { URL.revokeObjectURL(url); resolve(null) }
    }
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
  })
}

async function getVideoThumbnail(file: File): Promise<string> {
  return new Promise(resolve => {
    const video = document.createElement("video")
    video.preload = "metadata"
    const url = URL.createObjectURL(file)
    video.src = url
    video.onloadedmetadata = () => { video.currentTime = 0 }
    video.onseeked = () => {
      const canvas = document.createElement("canvas")
      canvas.width = 160; canvas.height = 90
      canvas.getContext("2d")?.drawImage(video, 0, 0, 160, 90)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", 0.6))
    }
    video.onerror = () => { URL.revokeObjectURL(url); resolve("") }
  })
}

/* ── StatusBar ───────────────────────────────────────────────────── */
function StatusBar({ time }: { time: Date | null }) {
  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
  return (
    <div className="flex items-center justify-between px-6 pt-4 text-foreground">
      <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
      <span className="text-[11px] font-semibold text-primary">LEX AI</span>
    </div>
  )
}

/* ── QuotaBar ────────────────────────────────────────────────────── */
function QuotaBar({ remaining, limit, onUpgrade }: { remaining: number; limit: number; onUpgrade: () => void }) {
  const pct  = Math.max(0, remaining / limit)
  const clr  = pct > 0.4 ? "#22c55e" : pct > 0.15 ? "#f59e0b" : "#ef4444"
  const used = limit - remaining
  if (isPremium()) return null
  return (
    <div className="mx-4 mb-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground">
          {remaining === 0 ? "Daily limit reached" : `${used} of ${limit} free messages used`}
        </span>
        <button onClick={onUpgrade} className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:opacity-80">
          <Sparkles className="size-3" /> Upgrade
        </button>
      </div>
      <div className="h-1 w-full rounded-full bg-accent/50 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(used / limit) * 100}%`, background: clr }} />
      </div>
    </div>
  )
}

/* ── Quick prompts ───────────────────────────────────────────────── */
const QUICK = [
  "What do you know about me?",
  "Summarize my day",
  "Help me write a message",
  "What's trending?",
]

/* ── ThinkingPanel ───────────────────────────────────────────────── */
function ThinkingPanel({ thinkText }: { thinkText: string }) {
  const [open, setOpen] = useState(false)
  if (!thinkText) {
    return (
      <div className="rounded-3xl rounded-bl-md border border-border/70 bg-popover px-4 py-3 shadow-sm">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className="size-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: `${i * 160}ms` }} />
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="max-w-[82%] rounded-3xl rounded-bl-md border border-violet-500/40 bg-violet-950/30 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left">
        <span className="flex gap-1">
          {[0, 1, 2].map(i => (
            <span key={i} className="size-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i * 160}ms` }} />
          ))}
        </span>
        <span className="text-[11px] font-semibold text-violet-300 flex-1">Reasoning…</span>
        <span className="text-[10px] text-violet-400/60">{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 max-h-32 overflow-y-auto">
          <p className="text-[10px] text-violet-300/70 leading-relaxed whitespace-pre-wrap">{thinkText}</p>
        </div>
      )}
    </div>
  )
}

/* ── AttachmentChip ─────────────────────────────────────────────── */
function AttachmentChip({ att, onRemove }: { att: Attachment; onRemove: () => void }) {
  return (
    <div className="mx-4 mb-2 flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2 shadow-sm">
      {(att.kind === "image" || att.kind === "video") && att.preview ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={att.preview} alt="" className="size-10 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {att.kind === "pdf"   && <FileText   className="size-5 text-primary" />}
          {att.kind === "audio" && <Headphones className="size-5 text-primary" />}
          {att.kind === "video" && <Video      className="size-5 text-primary" />}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{att.file.name}</p>
        <p className="text-[10px] text-muted-foreground capitalize">{att.kind}</p>
      </div>
      <button onClick={onRemove} className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:text-destructive">
        <X className="size-4" />
      </button>
    </div>
  )
}

/* ── VoiceConvoPanel ─────────────────────────────────────────────── */
function VoiceConvoPanel({
  live, listening, ttsPlaying, thinking, onEnd,
}: {
  live: string; listening: boolean; ttsPlaying: boolean; thinking: boolean; onEnd: () => void
}) {
  const state =
    thinking  ? "thinking"  :
    ttsPlaying ? "speaking"  :
    listening  ? "listening" : "idle"

  return (
    <div className="px-4 pb-3">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border/60 bg-card/80 px-4 py-4 shadow-md">
        <div className={cn(
          "size-14 rounded-full border-2 flex items-center justify-center transition-all duration-500",
          state === "listening" ? "border-primary   bg-primary/20   animate-pulse scale-110"
          : state === "speaking"  ? "border-emerald-500 bg-emerald-500/20 animate-pulse"
          : state === "thinking"  ? "border-violet-500  bg-violet-500/20"
          : "border-border bg-card/50"
        )}>
          {state === "listening" && <Mic      className="size-6 text-primary"          />}
          {state === "speaking"  && <VolumeX  className="size-6 text-emerald-400"      />}
          {state === "thinking"  && <Loader2  className="size-6 text-violet-400 animate-spin" />}
          {state === "idle"      && <Mic2     className="size-6 text-muted-foreground" />}
        </div>

        <p className="text-xs font-semibold text-muted-foreground">
          {state === "listening" ? "Listening…"
          : state === "speaking" ? "LEX is speaking…"
          : state === "thinking" ? "LEX is thinking…"
          : "Starting…"}
        </p>

        {live && (
          <p className="text-sm text-foreground text-center max-w-[240px] italic">"{live}"</p>
        )}

        <button
          onClick={onEnd}
          className="flex items-center gap-2 rounded-full bg-destructive/10 border border-destructive/30 px-4 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 active:scale-95 transition-all"
        >
          <Square className="size-3" /> End conversation
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────── */
/* MAIN EXPORT                                                         */
/* ─────────────────────────────────────────────────────────────────── */
export function LexScreen({
  goBack, time, messages, thinking, thinkText,
  sendMessage, navigate, ttsPlaying, startVoiceCommand, clearMessages,
}: AppShared) {
  const { success, error: toastError, info } = useToast()
  const [input,       setInput]       = useState("")
  const [quota,       setQuota]       = useState(() => getQuota())
  const [attachment,  setAttachment]  = useState<Attachment | null>(null)
  const [processing,  setProcessing]  = useState(false)
  const [uploadStage, setUploadStage] = useState<"reading"|"processing"|"uploading"|"analyzing"|"done"|"error"|null>(null)
  const [uploadPct,   setUploadPct]   = useState(0)
  const [predictions, setPredictions] = useState<string[]>([])
  const [voiceMode,   setVoiceMode]   = useState(false)
  const [live,        setLive]        = useState("")
  const [isListening, setIsListening] = useState(false)

  const endRef    = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const filesRef  = useRef<HTMLInputElement>(null)

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [_sessionId] = useState(() => getSessionId())

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, thinking])
  useEffect(() => { setQuota(getQuota()) }, [messages.length])

  /* revoke object URLs on unmount */
  useEffect(() => {
    return () => { if (attachment?.preview?.startsWith("blob:")) URL.revokeObjectURL(attachment.preview) }
  }, [attachment])

  /* ── Voice conversation loop ─────────────────────────────────── */
  const startConvo = useCallback(() => {
    setLive("")
    const ok = startConvoSTT(
      (text, isFinal) => {
        setLive(text)
        if (isFinal) {
          setIsListening(false)
          stopConvoSTT()
          if (text.trim()) sendMessage(text.trim())
        }
      },
      () => setIsListening(false)
    )
    setIsListening(ok)
  }, [sendMessage])

  useEffect(() => {
    if (!voiceMode) return
    if (thinking || ttsPlaying || isListening) return
    const t = setTimeout(() => { if (voiceMode) startConvo() }, 500)
    return () => clearTimeout(t)
  }, [voiceMode, thinking, ttsPlaying, isListening, startConvo])

  const enterVoiceMode = () => { setVoiceMode(true); setLive(""); setIsListening(false) }
  const exitVoiceMode  = () => { stopConvoSTT(); setVoiceMode(false); setLive(""); setIsListening(false) }

  /* ── Predictive suggestions ──────────────────────────────────── */
  useEffect(() => {
    fetch("/api/analysis?userId=local&type=patterns")
      .then(r => r.json())
      .then((data: { patterns?: Array<{ action: string; count: number; hour_of_day: number }> }) => {
        const hour     = new Date().getHours()
        const patterns = data.patterns ?? []
        const hits = patterns
          .filter(p => p.action.startsWith("chat:"))
          .sort((a, b) => {
            const d = Math.abs((a.hour_of_day ?? 12) - hour) - Math.abs((b.hour_of_day ?? 12) - hour)
            return d !== 0 ? d : b.count - a.count
          })
          .slice(0, 3)
          .map(p => p.action.replace("chat:", ""))
        if (hits.length) setPredictions(hits)
      })
      .catch(() => {})
  }, [])

  function trackUsage(text: string) {
    const now = new Date()
    fetch("/api/analysis", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "local", type: "usage", action: `chat:${text.slice(0, 60)}`,
        hour_of_day: now.getHours(), day_of_week: now.getDay(),
      }),
    }).catch(() => {})
  }

  /* ── Send ────────────────────────────────────────────────────── */
  const handleSend = async () => {
    const t = input.trim()
    if (!t && !attachment) return
    setInput("")

    if (attachment) {
      setProcessing(true)
      setUploadStage("reading")
      setUploadPct(10)
      try {
        let content    = t
        let imgDataUrl: string | undefined

        switch (attachment.kind) {
          case "image": {
            imgDataUrl = attachment.preview.startsWith("data:") ? attachment.preview : undefined
            setUploadStage("analyzing"); setUploadPct(40)
            const desc = await analyzeImage(attachment.file, t || undefined)
            setUploadPct(90)
            content    = t ? `${t}\n\n[Image: ${attachment.file.name}]\n${desc}`
                           : `[Image: ${attachment.file.name}]\n${desc}`
            break
          }
          case "pdf": {
            setUploadStage("processing"); setUploadPct(30)
            const text = await extractPdfText(attachment.file)
            setUploadPct(85)
            content    = t ? `${t}\n\n[PDF: ${attachment.file.name}]\n${text}`
                           : `Read and analyse this PDF (${attachment.file.name}):\n\n${text}`
            break
          }
          case "audio": {
            setUploadStage("uploading"); setUploadPct(30)
            const transcript = await transcribeAudio(attachment.file)
            setUploadPct(90)
            content = transcript || t || "I couldn't understand the audio."
            break
          }
          case "video": {
            setUploadStage("processing"); setUploadPct(25)
            const frame = await extractVideoFrame(attachment.file)
            setUploadPct(55)
            if (frame) {
              setUploadStage("analyzing")
              const ff   = new File([frame], "frame.jpg", { type: "image/jpeg" })
              const desc = await analyzeImage(ff, "Describe what's happening in this video frame in detail.")
              imgDataUrl = attachment.preview || undefined
              content    = t ? `${t}\n\n[Video: ${attachment.file.name}]\n${desc}`
                             : `[Video: ${attachment.file.name}]\n${desc}`
              setUploadPct(90)
            }
            break
          }
        }

        setUploadStage("done"); setUploadPct(100)
        success(`${attachment.kind === "audio" ? "Transcribed" : "Analyzed"} ${attachment.file.name}`)
        const kind = attachment.kind
        setAttachment(null)
        setTimeout(() => setUploadStage(null), 800)
        trackUsage(content)
        void kind
        await sendMessage(content, imgDataUrl)
      } catch (err) {
        setUploadStage("error")
        toastError("Processing failed", err instanceof Error ? err.message : "Please try again.")
        setTimeout(() => setUploadStage(null), 2000)
        setAttachment(null)
        if (t) await sendMessage(t)
      } finally {
        setProcessing(false)
      }
    } else {
      trackUsage(t)
      await sendMessage(t)
    }
  }

  /* ── Camera / file ───────────────────────────────────────────── */
  const handleCamera = () => cameraRef.current?.click()
  const handleFiles  = () => filesRef.current?.click()

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""

    /* ── File size validation ─────────────────────────────────────── */
    const isVideo = file.type.startsWith("video/")
    const limit   = isVideo ? MAX_VIDEO_BYTES : MAX_FILE_BYTES
    if (file.size > limit) {
      toastError(
        "File too large",
        isVideo
          ? `Videos must be under 100 MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB)`
          : `Files must be under 25 MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB)`
      )
      return
    }

    const mime = file.type
    let kind: AttachmentKind = "image"
    let preview = ""

    if (mime.startsWith("image/")) {
      kind    = "image"
      /* read as data URL so we can pass it to sendMessage later */
      preview = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    } else if (mime === "application/pdf" || file.name.endsWith(".pdf")) {
      kind = "pdf"
    } else if (mime.startsWith("audio/")) {
      kind = "audio"
    } else if (mime.startsWith("video/")) {
      kind    = "video"
      preview = await getVideoThumbnail(file)
    } else {
      kind = "audio"
    }

    setAttachment({ file, kind, preview })
  }

  /* ── Screenshot / screen share ───────────────────────────────── */
  const handleScreen = async () => {
    try {
      if (!navigator.mediaDevices || !("getDisplayMedia" in navigator.mediaDevices)) {
        info("Screen capture isn't supported in this browser.")
        return
      }
      const stream = await (navigator.mediaDevices as MediaDevices & {
        getDisplayMedia: (c?: object) => Promise<MediaStream>
      }).getDisplayMedia({ video: { frameRate: 1 } })

      const track  = stream.getVideoTracks()[0]

      /* Cross-browser frame capture via <video> + <canvas> (works everywhere) */
      const video  = document.createElement("video")
      video.srcObject = stream
      video.muted  = true
      await video.play()

      /* Wait one frame for video to render */
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))

      const canvas  = document.createElement("canvas")
      canvas.width  = video.videoWidth  || 1280
      canvas.height = video.videoHeight || 720
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)

      /* Stop all tracks */
      stream.getTracks().forEach(t => t.stop())
      video.srcObject = null

      canvas.toBlob(blob => {
        if (!blob) { toastError("Screen capture failed", "Could not capture a frame."); return }
        const file    = new File([blob], "screenshot.png", { type: "image/png" })
        const preview = canvas.toDataURL("image/jpeg", 0.6)
        setAttachment({ file, kind: "image", preview })
        info("Screenshot ready — add a message and send!")
      }, "image/png")

      void track
    } catch (err) {
      /* User cancelled or permission denied — not an error */
      if (err instanceof DOMException && err.name === "NotAllowedError") return
      toastError("Screen capture failed", "Try again or use the camera button instead.")
    }
  }

  const isLocked = quota.exhausted && !isPremium()

  /* ─────────────────────────────────────────────────────────────── */
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
              {thinking   ? "Thinking…"
              : ttsPlaying  ? "Speaking…"
              : voiceMode   ? "Voice conversation"
              : isLocked    ? "Upgrade to continue"
              : "Online · Ready to help"}
            </p>
          </div>
        </div>
        {/* voice command shortcut */}
        <button onClick={startVoiceCommand} title="Voice command" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary transition-colors">
          <Mic2 className="size-4" />
        </button>
        <button onClick={() => navigate("memory")} className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary transition-colors" title="Memory">
          <Brain className="size-4" />
        </button>
        {messages.length > 0 && (
          <button
            onClick={() => { clearMessages(); success("Conversation cleared") }}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-destructive transition-colors"
            title="Clear conversation"
          >
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
            <p className="mt-1 text-xs text-muted-foreground">Type, tap 🎙 to have a voice conversation, or try:</p>
            <div className="mt-4 w-full space-y-1.5">
              {(predictions.length > 0 ? predictions : QUICK).map(q => (
                <button
                  key={q}
                  onClick={() => { trackUsage(q); sendMessage(q) }}
                  className="w-full rounded-2xl border border-border bg-card/80 px-4 py-2.5 text-xs text-foreground text-left hover:bg-accent/50 active:bg-accent transition-colors flex items-center gap-2"
                >
                  {predictions.length > 0 && <Sparkles className="size-3 text-primary/60 shrink-0" />}
                  {q}
                </button>
              ))}
            </div>

            {/* capability hints */}
            <div className="mt-5 grid grid-cols-2 gap-2 w-full">
              {[
                { icon: <Camera className="size-3.5" />, label: "Analyze images" },
                { icon: <FileText className="size-3.5" />, label: "Read PDFs" },
                { icon: <Headphones className="size-3.5" />, label: "Transcribe audio" },
                { icon: <Video className="size-3.5" />, label: "Analyze video" },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 px-3 py-2">
                  <span className="text-primary">{c.icon}</span>
                  <span className="text-[10px] text-muted-foreground">{c.label}</span>
                </div>
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
              "max-w-[78%] rounded-3xl text-sm leading-relaxed overflow-hidden",
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-popover border border-border/70 text-foreground rounded-bl-md shadow-sm",
            )}>
              {/* image thumbnail in bubble */}
              {m.imageDataUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={m.imageDataUrl} alt="shared" className="w-full max-h-48 object-cover" />
              )}
              {m.role === "user" ? (
                <p className="px-4 py-2.5">{m.content}</p>
              ) : (
                <div className="px-4 py-2.5">
                  <MarkdownMsg text={m.content} />
                </div>
              )}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex items-end gap-2">
            <Image src="/lex-orb.png" alt="LEX" width={24} height={24} className="rounded-full shrink-0" />
            <ThinkingPanel thinkText={thinkText} />
          </div>
        )}

        {isLocked && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 text-center">
              <Sparkles className="mx-auto size-7 text-primary mb-2" />
              <p className="text-sm font-semibold text-foreground">Daily limit reached</p>
              <p className="mt-0.5 text-xs text-muted-foreground">You've used all 10 free messages today.</p>
              <button onClick={() => navigate("paywall")} className="mt-3 flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md mx-auto active:scale-95 transition-transform">
                <Zap className="size-3.5" /> Upgrade LEX
              </button>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* attachment preview */}
      {attachment && !processing && (
        <AttachmentChip att={attachment} onRemove={() => setAttachment(null)} />
      )}

      {/* chunked upload progress */}
      {uploadStage && attachment && (
        <ChunkProgress
          stage={uploadStage}
          progress={uploadPct}
          filename={attachment.file.name}
        />
      )}
      {uploadStage && !attachment && uploadStage === "done" && null}

      {/* hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelected} />
      <input ref={filesRef}  type="file" accept="image/*,application/pdf,audio/*,video/*" className="hidden" onChange={handleFileSelected} />

      {/* voice conversation OR text input */}
      {voiceMode ? (
        <VoiceConvoPanel
          live={live}
          listening={isListening}
          ttsPlaying={ttsPlaying}
          thinking={thinking}
          onEnd={exitVoiceMode}
        />
      ) : isLocked ? (
        <div className="px-4 pb-3">
          <button onClick={() => navigate("paywall")} className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-3 text-sm font-semibold text-primary active:scale-[0.98] transition-transform">
            <Sparkles className="size-4" /> Upgrade for unlimited messages
          </button>
        </div>
      ) : (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-3xl border border-border bg-card px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-1 shrink-0">
              {/* mic → enters voice conversation mode */}
              <button onClick={enterVoiceMode} title="Voice conversation" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent/60 active:scale-90 transition-all">
                <Mic className="size-4" />
              </button>
              <button onClick={handleCamera} title="Camera" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent/60 active:scale-90 transition-all">
                <Camera className="size-4" />
              </button>
              <button onClick={handleScreen} title="Screenshot" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent/60 active:scale-90 transition-all">
                <MonitorSmartphone className="size-4" />
              </button>
              <button onClick={handleFiles} title="Attach image / PDF / audio / video" className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-accent/60 active:scale-90 transition-all">
                <Paperclip className="size-4" />
              </button>
            </div>
            <div className="h-5 w-px bg-border/60 shrink-0" />
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={attachment ? `+ message (${attachment.kind})` : "Message LEX…"}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSend}
              disabled={thinking || processing || (!input.trim() && !attachment)}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm active:scale-90 transition-transform disabled:opacity-40"
            >
              {(thinking || processing) ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
