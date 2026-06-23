"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Camera, RefreshCw, CheckCircle2, Loader2, ScanFace } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FaceDescriptor { values: number[] }

/* Compute a 64-cell (8×8) grayscale average descriptor from a video frame.
   Simple, device-local, fast — no ML library needed for enrollment. */
function computeDescriptor(video: HTMLVideoElement): FaceDescriptor {
  const SIZE = 64
  const CELLS = 8
  const canvas = document.createElement("canvas")
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext("2d")!
  ctx.drawImage(video, 0, 0, SIZE, SIZE)
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

  const cellSz = SIZE / CELLS
  const values: number[] = []

  for (let cy = 0; cy < CELLS; cy++) {
    for (let cx = 0; cx < CELLS; cx++) {
      let sum = 0
      for (let py = 0; py < cellSz; py++) {
        for (let px = 0; px < cellSz; px++) {
          const x   = cx * cellSz + px
          const y   = cy * cellSz + py
          const idx = (y * SIZE + x) * 4
          sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
        }
      }
      values.push(sum / (cellSz * cellSz))
    }
  }
  return { values }
}

export function cosineSimilarity(a: FaceDescriptor, b: FaceDescriptor): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.values.length; i++) {
    dot  += a.values[i] * b.values[i]
    magA += a.values[i] ** 2
    magB += b.values[i] ** 2
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export const FACE_THRESHOLD = 0.975  // cosine similarity required for match

export const FACE_STORAGE_KEY = "lex-face-descriptor-v2"

export function saveFaceLocally(d: FaceDescriptor) {
  localStorage.setItem(FACE_STORAGE_KEY, JSON.stringify(d))
}
export function loadFaceLocally(): FaceDescriptor | null {
  try {
    const raw = localStorage.getItem(FACE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/* ── Face Enrollment Component ──────────────────────────────── */
interface FaceEnrollProps {
  onEnrolled: (descriptor: FaceDescriptor) => void
  onSkip?:   () => void
}

export function FaceEnroll({ onEnrolled, onSkip }: FaceEnrollProps) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [status,    setStatus]    = useState<"idle" | "loading" | "streaming" | "countdown" | "done" | "error">("idle")
  const [countdown, setCountdown] = useState(0)
  const [message,   setMessage]   = useState("")

  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  const startCamera = useCallback(async () => {
    setStatus("loading")
    setMessage("")
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = s
      if (videoRef.current) {
        videoRef.current.srcObject = s
        await videoRef.current.play()
      }
      setStatus("streaming")
      setMessage("Look directly at the camera, then tap capture")
    } catch {
      setStatus("error")
      setMessage("Camera access denied — please allow camera to use Face ID.")
    }
  }, [])

  const capture = useCallback(async () => {
    if (!videoRef.current) return
    setStatus("countdown")

    for (let i = 3; i >= 1; i--) {
      setCountdown(i)
      await new Promise(r => setTimeout(r, 900))
    }
    setCountdown(0)

    const descriptor = computeDescriptor(videoRef.current)

    /* stop stream */
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null

    /* persist locally (works offline for lock screen) */
    saveFaceLocally(descriptor)

    /* also send to server */
    fetch("/api/face", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descriptor }),
    }).catch(() => {})

    setStatus("done")
    setMessage("Face enrolled! Tap finish to continue.")
    setTimeout(() => onEnrolled(descriptor), 1200)
  }, [onEnrolled])

  return (
    <div className="flex flex-col items-center gap-4 w-full">

      {/* ── Camera / status circle ── */}
      <div className="relative w-56 h-56 rounded-full overflow-hidden border-4 bg-black"
        style={{ borderColor: status === "done" ? "#22c55e" : status === "error" ? "#ef4444" : "oklch(0.7 0.15 45)" }}
      >
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className={cn("w-full h-full object-cover scale-x-[-1]",
            (status !== "streaming" && status !== "countdown") && "hidden"
          )}
        />

        {/* face oval guide */}
        {(status === "streaming" || status === "countdown") && (
          <div className="absolute inset-4 rounded-full border-2 border-dashed pointer-events-none"
            style={{ borderColor: "oklch(0.7 0.15 45 / 0.6)" }}
          />
        )}

        {/* countdown overlay */}
        {status === "countdown" && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-8xl font-black text-white tabular-nums">{countdown}</span>
          </div>
        )}

        {/* idle */}
        {status === "idle" && (
          <div className="flex h-full items-center justify-center">
            <ScanFace className="size-20 text-white/20" />
          </div>
        )}

        {/* loading */}
        {status === "loading" && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-12 text-primary animate-spin" />
          </div>
        )}

        {/* done */}
        {status === "done" && (
          <div className="flex h-full items-center justify-center bg-green-500/20">
            <CheckCircle2 className="size-20 text-green-400" />
          </div>
        )}
      </div>

      {/* ── Status label ── */}
      {status === "idle" && (
        <p className="text-sm text-muted-foreground text-center">
          LEX will capture your face and store it securely in the database for biometric unlock.
        </p>
      )}
      {message && (
        <p className={cn(
          "text-sm text-center font-medium",
          status === "error" ? "text-red-400" : status === "done" ? "text-green-400" : "text-muted-foreground"
        )}>
          {message}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col gap-2 w-full">
        {status === "idle" && (
          <button
            onClick={startCamera}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Camera className="size-4" /> Open Camera
          </button>
        )}

        {status === "streaming" && (
          <button
            onClick={capture}
            className="w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <ScanFace className="size-4" /> Capture My Face (3s countdown)
          </button>
        )}

        {status === "error" && (
          <button
            onClick={startCamera}
            className="w-full rounded-2xl border border-primary/40 bg-primary/10 py-3 text-sm font-medium text-primary active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="size-4" /> Try Again
          </button>
        )}

        {onSkip && status !== "done" && (
          <button onClick={onSkip} className="py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Skip — use {"{lock type}"} only
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Face Verify Component (used on lock screen) ─────────────── */
interface FaceVerifyProps {
  onSuccess: () => void
  onFail:    () => void
  onCancel:  () => void
}

export function FaceVerify({ onSuccess, onFail, onCancel }: FaceVerifyProps) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [status,  setStatus]  = useState<"loading" | "streaming" | "checking" | "fail" | "error">("loading")
  const [message, setMessage] = useState("Opening camera…")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return }
        streamRef.current = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          await videoRef.current.play()
        }
        setStatus("streaming")
        setMessage("Look at the camera")
      } catch {
        setStatus("error")
        setMessage("Camera not available")
      }
    })()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const verify = useCallback(async () => {
    if (!videoRef.current) return
    setStatus("checking")
    setMessage("Scanning…")

    await new Promise(r => setTimeout(r, 600))

    const stored = loadFaceLocally()
    if (!stored) {
      setMessage("No face enrolled — use your PIN/Pattern.")
      setStatus("fail")
      streamRef.current?.getTracks().forEach(t => t.stop())
      setTimeout(onFail, 1500)
      return
    }

    const live = computeDescriptor(videoRef.current)
    const similarity = cosineSimilarity(stored, live)
    streamRef.current?.getTracks().forEach(t => t.stop())

    if (similarity >= FACE_THRESHOLD) {
      onSuccess()
    } else {
      setStatus("fail")
      setMessage(`Face not recognised (${(similarity * 100).toFixed(0)}% match). Try again.`)
      setTimeout(onFail, 1800)
    }
  }, [onSuccess, onFail])

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 bg-black"
        style={{ borderColor: status === "fail" ? "#ef4444" : "oklch(0.7 0.15 45)" }}
      >
        <video
          ref={videoRef}
          autoPlay playsInline muted
          className={cn("w-full h-full object-cover scale-x-[-1]",
            (status !== "streaming") && "hidden"
          )}
        />
        {(status === "loading" || status === "checking") && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-10 text-primary animate-spin" />
          </div>
        )}
        {(status === "fail" || status === "error") && (
          <div className="flex h-full items-center justify-center bg-red-500/20">
            <ScanFace className="size-12 text-red-400" />
          </div>
        )}
        {(status === "streaming") && (
          <div className="absolute inset-4 rounded-full border-2 border-dashed pointer-events-none"
            style={{ borderColor: "oklch(0.7 0.15 45 / 0.7)" }}
          />
        )}
      </div>

      <p className="text-sm text-white/80 text-center">{message}</p>

      <div className="flex flex-col gap-2 w-full">
        {status === "streaming" && (
          <button
            onClick={verify}
            className="w-full rounded-2xl bg-white/15 border border-white/20 py-3 text-sm font-semibold text-white active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <ScanFace className="size-4" /> Verify Face
          </button>
        )}
        <button
          onClick={onCancel}
          className="w-full py-2.5 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          Use PIN / Pattern instead
        </button>
      </div>
    </div>
  )
}
