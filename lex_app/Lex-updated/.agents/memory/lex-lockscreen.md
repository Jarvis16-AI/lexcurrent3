---
name: LEX Lock Screen Features
description: Architecture for lock screen customisation, premium widgets, and settings wiring
---

## Files
- `lib/lock-screen-settings.ts` — types, localStorage helpers, wallpaper/blur/anim constants
- `components/lex/lock/screen.tsx` — full lock screen with all features
- `components/lex/lock/settings-panel.tsx` — settings UI embedded in settings.tsx
- `lib/quota.ts` — now exports `hasAtLeast(tier)` helper

## Free Features (all users)
- **8 Wallpapers**: default, cosmos, aurora, ocean, sunset, forest, neon, mono — gradient strings in LOCK_WALLPAPERS
- **Blur**: none/light/medium/heavy — BLUR_CLASSES + BLUR_BG maps apply to card backgrounds
- **Unlock Animations**: slide/fade/scale/spring — ANIM_CLASSES applied via `key={panelKey}` on unlock panel div
- **Quick Apps**: flashlight (torch constraint via getUserMedia) + camera (hidden file input `capture="environment"`)

## Premium Features
- **Pro**: AI Widgets (weather detail + battery via Battery Status API), Context Cards (time-of-day greeting)
- **Plus**: Smart Reminders (from `lex-reminders-v1` localStorage), Daily Briefing (morning weather card, hours 5-11 only)
- **Ultra**: Goal Tracking (from `lex-goals-v1` localStorage, progress bars)

## Data Storage
- Lock screen settings: `lex-lockscreen-settings-v1` (type: LockScreenSettings)
- Goals: `lex-goals-v1` as `LockGoal[]` — managed from settings panel when Ultra active
- Reminders: `lex-reminders-v1` as `LockReminder[]` — managed from settings panel when Plus active

## Gating Pattern
- `hasAtLeast("pro"|"plus"|"ultra")` checks tier hierarchy
- Premium toggles in settings panel show upgrade prompt when not subscribed
- Lock screen reads settings + tier at mount via `loadLockSettings()` + `getPremiumTier()`

## Key Design Decisions
- Lock screen reads its own settings from localStorage directly (not passed from parent) — keeps it isolated
- `panelKey` state increments each time unlock panel opens, forcing re-mount and re-triggering animation
- Battery widget uses Battery Status API with @ts-ignore (non-standard, Android Chrome only)
- Daily Briefing only renders between hours 5–11 (morning only)

**Why separate localStorage key:** Lock screen renders before main app loads, so it can't depend on app-level settings state.
