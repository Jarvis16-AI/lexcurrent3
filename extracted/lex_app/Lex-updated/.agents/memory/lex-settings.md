---
name: LEX Settings Architecture
description: How app settings are stored, applied, and surfaced in the settings screen
---

Settings are stored in `localStorage` under key `lex-settings-v1` as JSON matching `AppSettings` interface in `lib/settings.ts`.

**Key files:**
- `lib/settings.ts` — types, defaults, `loadSettings/saveSettings`, `applyTheme/applyAccent/applyFontSize/applyAllSettings`, `WALLPAPERS`, `ACCENT_PRESETS`, `FALLBACK_VOICES`
- `components/lex/app/settings.tsx` — full Settings screen (voice picker, theme pills, wallpaper swatches, accent colours, font size, AI personality, lock change)
- `components/lex/app/index.tsx` — loads settings on mount, calls `applyAllSettings`, passes `settings + onSettingsChange` to SettingsScreen

**How:**
- Theme: toggles `dark` class on `document.documentElement`
- Accent: sets `--primary` CSS custom property (OKLCH format)
- Font size: sets `--app-font-size` CSS custom property
- Wallpaper: inline `background` style on the fixed wallpaper div using radial-gradient strings from `WALLPAPERS`

**Why:** All settings apply live (no page reload). Dynamic Tailwind classes don't work at runtime so wallpapers use inline styles.

**How to apply:** On any settings change call `handleSettingsChange(newSettings)` in index.tsx — it updates state, saves to localStorage, and calls `applyAllSettings`.
