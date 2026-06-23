# LEX — AI OS

An intelligent AI-powered launcher and assistant built as a Next.js PWA with Capacitor for native Android support.

## Tech Stack
- **Framework**: Next.js 16.2.6 (App Router, Turbopack) with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0, Shadcn UI
- **Authentication**: Clerk (keep this — do not replace)
- **AI/LLM**: Groq SDK (primary), ElevenLabs (voice), Edge TTS (free TTS)
- **Database**: PostgreSQL via Replit's built-in DB (`pg`)
- **Mobile**: Capacitor for Android builds

## Running the App
- Workflow: **Start LEX** → `pnpm dev` on port 5000
- The app is a Next.js app at the workspace root

## Project Structure
```
app/           → Next.js App Router pages and API routes
components/    → React UI components
  lex/app/     → Main launcher screens (home, chat, voice, settings, etc.)
  lex/lock/    → Lock screen (pin, pattern, setup)
lib/           → Shared utilities (AI, DB, memory, TTS, auth guard, etc.)
public/        → Static assets
```

## Key Files
- `lib/groq.ts` — System prompt and chat logic
- `lib/memory.ts` — Memory extraction, vitality, context building
- `lib/edge-tts.ts` — TTS with markdown cleaning
- `app/api/weather/route.ts` — Weather with retry, caching, 3-day forecast
- `app/api/chat/route.ts` — Main AI chat endpoint
- `app/api/memory/route.ts` — Memory CRUD
- `components/lex/app/index.tsx` — Main app shell with weather caching + context builder
- `components/lex/app/home.tsx` — Home screen with rich weather widget

## Environment Variables Required
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk public key
- `CLERK_SECRET_KEY` — Clerk secret key
- `GROQ_API_KEY` — Groq API key
- `DATABASE_URL` — PostgreSQL connection string
- `ELEVENLABS_API_KEY` — Optional, for premium voice
- `ADMIN_SECRET_KEY` — Optional, for admin endpoints

## User Preferences
- Do not change the authentication provider — Clerk stays
- Build with confidence and polish, performance-first
- The codebase follows a clean layered pattern (API → lib → components)
