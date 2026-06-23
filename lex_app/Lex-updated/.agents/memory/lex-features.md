---
name: LEX 6-Feature System
description: Memory Tree, Permissions, Analysis, Universal Search, Emergency mode — architecture and wiring
---

## New Screens
- `memory` → MemoryTreeScreen — color-coded by 8 categories; auto-extracted after each chat; manual add/delete
- `permissions` → PermissionsScreen — checks mic/camera/location/notifications/screen/storage via browser Permissions API
- `analysis` → AnalysisScreen — screen time per screen + weekly bar chart + daily limit slider; data in PostgreSQL
- `search` → SearchScreen — searches apps/settings/screens/memories/chat history via /api/search; recent searches in localStorage
- `emergency` → EmergencyScreen — CRUD contacts in PostgreSQL; calls via `tel:` link; accessed via orb long-hold

## Orb Behaviour
- Tap = navigate to LEX chat
- Hold 2 seconds (no drag) = navigate to emergency screen; orb glows red and pings while holding

## Screen Time Tracking
- Recorded on every `navigate()` call: previous screen + elapsed ms
- Batched in localStorage `lex-st-batch-v1`, flushed to `/api/analysis` every 5 entries or on beforeunload
- Attention banner shows after 30 min on same screen (non-voice/non-emergency)

## Memory Context in Chat
- `sendMessage` calls `getCtx()` which fetches all memories from `/api/memory`, groups by category, injects as system context before Groq call
- After each reply, async call to `/api/memory` with `userMessage + assistantReply` triggers Groq-powered extraction

## Voice Commands
- After transcription (Groq Whisper or browser STT), `parseVoiceCmd()` checks for navigation commands ("go to memory", "open whatsapp") before calling sendMessage
- App launch via `CustomEvent("lex-open-app")` dispatched to window — DrawerScreen listens for it

## Bottom Nav Change
- Replaced Space tab with Search tab (Search icon → SearchScreen)

## DB Tables
- `memories` (id, user_id, category, content, confidence, last_reinforced, created_at)
- `screen_time` (id, user_id, screen, duration_ms, recorded_at)
- `analysis_settings` (user_id PK, daily_limit_minutes, focus_apps, distraction_apps, wake_time, sleep_time, attention_threshold)
- `usage_patterns` (id, user_id, action, count, last_used, hour_of_day, day_of_week)
- `emergency_contacts` (id, user_id, name, phone, relation, priority, created_at)

**Why:** All tables use CREATE TABLE IF NOT EXISTS in route handlers — no migration needed.
