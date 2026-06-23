---
name: LEX backend stack
description: API routes, AI providers, DB schema, and payment setup for the LEX launcher
---

## AI
- Chat: Groq `llama-3.3-70b-versatile` via `/api/chat` (POST messages[], context?)
- Transcription: Groq `whisper-large-v3-turbo` via `/api/transcribe` (POST multipart audio)
- Voice TTS: ElevenLabs `eleven_turbo_v2` via `/api/voice` (POST text → audio/mpeg)

## Database (Replit PostgreSQL)
Tables: users, conversations, voice_sessions, subscriptions
Connection via `lib/db.ts` pool using DATABASE_URL secret.

## Payments (Stanbic)
- Plans in `lib/stanbic.ts`: pro_plus (K49.99 ZMW), ultra (K99.99 ZMW)
- Sandbox mode when STANBIC_API_KEY / STANBIC_API_URL not set (PAYMENTS_MODE=sandbox)
- Webhook at `/api/payments/webhook` updates subscription status on success

## Weather
- Free Open-Meteo API proxied at `/api/weather?lat=X&lng=Y`
- Reverse geocode via Nominatim (no key needed)
- Lusaka (-15.4167, 28.2833) used as fallback

## Live Launcher
- `components/lex/live-launcher.tsx` — full interactive client component
- 3 screens: home / lex (chat) / voice (recording)
- Uses `/public/lex-orb.png` (1024×1024) for the orb image
- Voice flow: MediaRecorder → /api/transcribe → /api/chat → /api/voice → Audio.play()

**Why:** Groq is fast (low latency for chat+voice), ElevenLabs for quality TTS, Stanbic for ZMW payments.
