import { createClient } from "@supabase/supabase-js"

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? ""
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""

if (!supabaseUrl && process.env.NODE_ENV !== "test") {
  console.warn("[LEX] NEXT_PUBLIC_SUPABASE_URL not set — Supabase features unavailable")
}

export const supabase = supabaseUrl
  ? createClient(supabaseUrl, supabaseAnon)
  : null

export const supabaseAdmin = supabaseUrl && supabaseService
  ? createClient(supabaseUrl, supabaseService, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnon)
}

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id:            string
          clerk_user_id: string
          display_name:  string | null
          role:          "standard_user" | "premium_user" | "developer" | "admin"
          premium_tier:  "free" | "pro" | "plus" | "ultra" | null
          premium_until: string | null
          created_at:    string
          updated_at:    string
        }
        Insert: Omit<Database["public"]["Tables"]["user_profiles"]["Row"], "id" | "created_at" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["user_profiles"]["Insert"]>
      }
      user_settings: {
        Row: {
          id:            string
          clerk_user_id: string
          settings:      Record<string, unknown>
          updated_at:    string
        }
        Insert: Omit<Database["public"]["Tables"]["user_settings"]["Row"], "id" | "updated_at">
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>
      }
      activation_codes: {
        Row: {
          id:              string
          code:            string
          tier:            "pro" | "plus" | "ultra"
          duration_days:   number | null
          is_used:         boolean
          used_by:         string | null
          used_at:         string | null
          created_by:      string
          created_at:      string
          disabled:        boolean
          label:           string | null
        }
      }
      conversation_history: {
        Row: {
          id:            string
          clerk_user_id: string
          messages:      unknown[]
          model_id:      string
          created_at:    string
        }
      }
    }
  }
}
