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

export interface WeatherForecastDay {
  date:   string
  high:   number
  low:    number
  icon:   string
  label:  string
  precip: number
}

export interface Weather {
  temp:      number
  feelsLike: number
  humidity:  number
  wind:      number
  precip?:   number
  label:     string
  icon:      string
  high:      number
  low:       number
  city:      string
  country?:  string
  unit:      string
  windUnit?: string
  isDay?:    boolean
  forecast?: WeatherForecastDay[]
}

export interface Msg {
  role:          "user" | "assistant"
  content:       string
  imageDataUrl?: string   /* display only — not sent to API */
}

export interface Task {
  id:    number
  text:  string
  done:  boolean
  time?: string
}

export interface Memory {
  id:         number
  category:   string
  content:    string
  confidence: number
  created_at: string
}

export interface AnalysisSettings {
  daily_limit_minutes: number
  focus_apps:          string[]
  distraction_apps:    string[]
  wake_time:           string
  sleep_time:          string
  attention_threshold: number
}

export interface EmergencyContact {
  id:       number
  name:     string
  phone:    string
  relation: string
  priority: number
}

export interface AppShared {
  screen:           Screen
  navigate:         (s: Screen) => void
  goBack:           () => void
  weather:          Weather | null
  time:             Date | null
  messages:         Msg[]
  thinking:         boolean
  thinkText:        string
  recording:        boolean
  ttsPlaying:       boolean
  stopTTS:          () => void
  sendMessage:      (text: string, imageDataUrl?: string) => Promise<void>
  startVoice:       () => Promise<void>
  stopVoice:        () => void
  startVoiceCommand: () => void
  clearMessages:    () => void
}
