export type Screen =
  | "home"
  | "lex"
  | "voice"
  | "focus"
  | "space"
  | "drawer"
  | "settings"
  | "paywall"
  | "payment"
  | "context"
  | "profile"
  | "memory"
  | "permissions"
  | "analysis"
  | "search"
  | "emergency"

export interface Weather {
  temp: number
  feelsLike: number
  humidity: number
  wind: number
  label: string
  icon: string
  high: number
  low: number
  city: string
  unit: string
}

export interface Msg {
  role: "user" | "assistant"
  content: string
}

export interface Task {
  id: number
  text: string
  done: boolean
  time?: string
}

export interface Memory {
  id: number
  category: string
  content: string
  confidence: number
  created_at: string
}

export interface AnalysisSettings {
  daily_limit_minutes: number
  focus_apps: string[]
  distraction_apps: string[]
  wake_time: string
  sleep_time: string
  attention_threshold: number
}

export interface EmergencyContact {
  id: number
  name: string
  phone: string
  relation: string
  priority: number
}

export interface AppShared {
  screen: Screen
  navigate: (s: Screen) => void
  goBack: () => void
  weather: Weather | null
  time: Date | null
  messages: Msg[]
  thinking: boolean
  recording: boolean
  sendMessage: (text: string) => Promise<void>
  startVoice: () => Promise<void>
  stopVoice: () => void
}
