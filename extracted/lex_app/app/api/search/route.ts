import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireAuth } from "@/lib/auth-guard"

const ALL_APPS = [
  { label: "Airtel",      category: "Utilities"     },
  { label: "Amazon",      category: "Shopping"      },
  { label: "Banking",     category: "Finance"       },
  { label: "Booking",     category: "Travel"        },
  { label: "Camera",      category: "System"        },
  { label: "Chrome",      category: "Web"           },
  { label: "DStv",        category: "Media"         },
  { label: "Flights",     category: "Travel"        },
  { label: "Gmail",       category: "Communication" },
  { label: "Health",      category: "Health"        },
  { label: "Jumia",       category: "Shopping"      },
  { label: "Maps",        category: "Navigation"    },
  { label: "Messages",    category: "Communication" },
  { label: "Music",       category: "Media"         },
  { label: "News",        category: "News"          },
  { label: "Phone",       category: "System"        },
  { label: "Settings",    category: "System"        },
  { label: "Stanbic",     category: "Finance"       },
  { label: "WhatsApp",    category: "Communication" },
  { label: "Wikipedia",   category: "Knowledge"     },
  { label: "YouTube",     category: "Media"         },
]

const SETTINGS_OPTIONS = [
  "Theme", "Dark Mode", "Light Mode", "Accent Color", "Wallpaper", "Font Size",
  "Voice Settings", "AI Personality", "Lock Screen", "PIN", "Face ID",
  "Notifications", "Privacy", "About", "Subscription", "Upgrade",
]

const SCREENS = [
  { label: "Memory Tree",       screen: "memory"    },
  { label: "Personal Analysis", screen: "analysis"  },
  { label: "Permissions",       screen: "permissions"},
  { label: "Emergency Contacts",screen: "emergency" },
  { label: "Space",             screen: "space"     },
  { label: "Focus Mode",        screen: "focus"     },
  { label: "Settings",          screen: "settings"  },
  { label: "App Drawer",        screen: "drawer"    },
]

export async function GET(req: NextRequest) {
  /* Auth required — search returns the user's personal memories */
  const { userId, error } = await requireAuth()
  if (error) return error

  try {
    const q = req.nextUrl.searchParams.get("q")?.toLowerCase().trim() ?? ""
    if (!q || q.length < 2) return NextResponse.json({ results: [] })

    /* Sanitise: limit query length to prevent abuse */
    const safeQ = q.slice(0, 100)

    const results: Array<{ type: string; label: string; sub?: string; action?: string }> = []

    for (const app of ALL_APPS) {
      if (app.label.toLowerCase().includes(safeQ)) {
        results.push({ type: "app", label: app.label, sub: app.category, action: `open:${app.label}` })
      }
    }

    for (const s of SETTINGS_OPTIONS) {
      if (s.toLowerCase().includes(safeQ)) {
        results.push({ type: "setting", label: s, sub: "Settings", action: "navigate:settings" })
      }
    }

    for (const sc of SCREENS) {
      if (sc.label.toLowerCase().includes(safeQ)) {
        results.push({ type: "screen", label: sc.label, sub: "LEX", action: `navigate:${sc.screen}` })
      }
    }

    /* Memories — scoped to authenticated user only */
    try {
      const memRows = await query<{ id: number; category: string; content: string }>(
        `SELECT id, category, content FROM memories
         WHERE user_id = $1 AND content ILIKE $2 LIMIT 5`,
        [userId, `%${safeQ}%`]
      )
      for (const m of memRows) {
        results.push({ type: "memory", label: m.content, sub: `Memory · ${m.category}`, action: "navigate:memory" })
      }
    } catch { /* memories table may not exist yet */ }

    /* Conversations — scoped to authenticated user's session only */
    try {
      const convRows = await query<{ session_id: string }>(
        `SELECT session_id FROM conversations
         WHERE user_id = $1 AND messages::text ILIKE $2 LIMIT 3`,
        [userId, `%${safeQ}%`]
      )
      for (const r of convRows) {
        results.push({ type: "chat", label: `Chat: "${safeQ}"`, sub: `Session ${r.session_id?.slice(0, 8)}`, action: "navigate:lex" })
      }
    } catch { /* conversations table may not exist or lack user_id column */ }

    return NextResponse.json({ results: results.slice(0, 20) })
  } catch (err) {
    console.error("[search]", err)
    return NextResponse.json({ results: [] })
  }
}
