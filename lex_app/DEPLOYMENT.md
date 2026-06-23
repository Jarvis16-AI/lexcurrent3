# LEX AI OS — Deployment Guide

## Quick Deploy (Replit)

1. Click **Deploy** → **Autoscale** in the Replit sidebar
2. Set all secrets (see below) in the **Production** environment
3. Replit builds and deploys automatically — your app gets a `.replit.app` domain

---

## Required Secrets

| Secret | Where to get it | Required? |
|--------|-----------------|-----------|
| `CLERK_SECRET_KEY` | dashboard.clerk.com → API Keys | ✅ Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | dashboard.clerk.com → API Keys | ✅ Yes |
| `GROQ_API_KEY` | console.groq.com → API Keys | ✅ Yes |
| `GOOGLE_AI_API_KEY` | aistudio.google.com | Optional |
| `DATABASE_URL` | Auto-set by Replit PostgreSQL | ✅ Yes |
| `ADMIN_SECRET_KEY` | Choose any strong password | ✅ Yes |
| `NEXT_PUBLIC_SENTRY_DSN` | sentry.io → Project → DSN | Optional |
| `SENTRY_DSN` | sentry.io → Project → DSN | Optional |

---

## Environment Setup

### Development
```bash
npm run dev -- --port 5000
```

### Production build check (local)
```bash
npm run build
npm run start
```

---

## Database Migrations

All tables are created automatically (CREATE TABLE IF NOT EXISTS) on first use:
- `users` — Clerk user sync
- `bypass_codes` — Premium access codes
- `error_logs` — Frontend error capture
- `memories` — LEX memory tree
- `analysis_events` — Usage analytics

No manual migration steps needed.

---

## Admin Panel

Go to `/admin/codes` → enter your `ADMIN_SECRET_KEY` to:
- Generate bypass codes for paying customers
- View and deactivate codes
- Check redemption counts

---

## Sentry Integration (Optional)

1. Create a project at [sentry.io](https://sentry.io)
2. Copy the DSN
3. Add to Replit Secrets:
   - `NEXT_PUBLIC_SENTRY_DSN` = your DSN
   - `SENTRY_DSN` = same DSN
4. Errors are automatically captured from:
   - React Error Boundaries (component crashes)
   - Global `window.onerror` and `unhandledrejection`
   - `/api/errors` endpoint (frontend-reported errors)
   - Server-side via `captureServerError()`

---

## Rollback Plan

### Option A — Replit Checkpoint (recommended)
- Every agent session creates a checkpoint commit
- In Replit: **Version Control** → pick a checkpoint → **Restore**
- The database is NOT rolled back (schema is additive, safe)

### Option B — Git revert
```bash
# View recent checkpoints
git log --oneline -20

# Revert to a specific commit
git revert <commit-sha>
```

### Option C — Emergency: revert a bad deploy
1. In Replit Deploy panel → **Rollback** → select previous deployment
2. The previous build is live in < 60 seconds
3. Fix the issue in dev, then redeploy

---

## Health Checks

| Endpoint | Expected | Meaning |
|----------|----------|---------|
| `GET /api/voice` | `{"configured":true}` | Edge TTS working |
| `GET /api/weather` | weather JSON | Weather API working |
| `GET /api/chat` (POST) | streaming response | Groq working |
| `POST /api/bypass` | `{"valid":...}` | DB + bypass codes working |

---

## Performance Notes

- **Groq** free tier: 30 req/min, 6000 tokens/min
- **Edge TTS** (`msedge-tts`): free, no rate limit, but WebSocket-based — expect ~500ms latency
- **pdfjs-dist**: runs client-side, no server load
- **Clerk**: 10,000 MAU free on development keys

---

## Monitoring

After enabling Sentry, monitor:
- **Error rate** — check the Issues tab
- **P95 response time** — Performance tab
- **Quota exhaustion** — filter logs for `quotaExhausted: true`
- **TTS failures** — filter server logs for `[voice] error`
