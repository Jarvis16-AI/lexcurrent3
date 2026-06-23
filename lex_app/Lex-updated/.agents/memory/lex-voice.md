---
name: LEX Voice System
description: How ElevenLabs TTS is wired: voice selection, voice ID routing, toggle/autoSpeak flags
---

**API:** POST `/api/voice` accepts `{ text: string, voiceId?: string }`. If `voiceId` is omitted it falls back to `ELEVENLABS_VOICE_ID` env var or hardcoded Rachel (`21m00Tcm4TlvDq8ikWAM`).

**Library:** `lib/elevenlabs.ts` — `textToSpeech(text, voiceId?)` and `getVoices()`. Uses `eleven_turbo_v2` model.

**Settings integration:**
- `settings.voiceId` — selected ElevenLabs voice ID
- `settings.voiceEnabled` — master on/off toggle for TTS
- `settings.autoSpeak` — if false, speakReply() returns immediately without calling API

**`speakReply()` in index.tsx:** reads `loadSettings()` (not stale closure) to get current voiceId, voiceEnabled, autoSpeak before each call.

**Voice list:** GET `/api/voice` returns `{ voices: [{id, name, category}], configured: bool }`. Settings screen fetches this on mount; falls back to `FALLBACK_VOICES` constant in `lib/settings.ts` if API fails or not configured.

**Preview:** Settings screen has "Preview Voice" button that calls POST `/api/voice` with a test phrase and the selected voiceId, then plays the audio blob.

**Why:** voiceId must come from settings (not hardcoded) so users can change it live in Settings screen.
