---
name: LEX orb positioning
description: How the orb is placed in NavDock to avoid overlapping content
---

## Rule
Never use `absolute bottom-14 left-1/2 -translate-x-1/2` for the orb in PhoneFrame screens.
The orb must live inside NavDock via the `showOrb` prop.

## How to apply
- `<NavDock active="home" showOrb />` renders orb as center dock item (size-10)
- For screens without NavDock (e.g. ListeningVoice), place orb inline in the bottom bar row
- The animated SVG orb is used in mockup screens; `/public/lex-orb.png` is used in the LiveLauncher

**Why:** Absolute-positioned orb at bottom-14 overlaps GlassCard content and NavDock icons, making text unreadable.
