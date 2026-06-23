import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"

export const EDGE_TTS_VOICES = [
  { id: "en-US-AriaNeural",    name: "Aria — Female, American"      },
  { id: "en-US-JennyNeural",   name: "Jenny — Female, Friendly"     },
  { id: "en-US-GuyNeural",     name: "Guy — Male, American"         },
  { id: "en-US-EricNeural",    name: "Eric — Male, Friendly"        },
  { id: "en-US-DavisNeural",   name: "Davis — Male, Casual"         },
  { id: "en-GB-SoniaNeural",   name: "Sonia — Female, British"      },
  { id: "en-GB-RyanNeural",    name: "Ryan — Male, British"         },
  { id: "en-AU-NatashaNeural", name: "Natasha — Female, Australian" },
  { id: "en-IN-NeerjaNeural",  name: "Neerja — Female, Indian"      },
  { id: "en-US-AndrewNeural",  name: "Andrew — Male, Warm"          },
]

export const DEFAULT_VOICE = "en-US-AriaNeural"

/**
 * Strip markdown and symbols that sound unnatural when spoken aloud.
 * This converts text intended for display into clean, speakable prose.
 */
export function cleanTextForSpeech(raw: string): string {
  return raw
    /* Remove markdown headers */
    .replace(/#{1,6}\s+/g, "")
    /* Remove bold/italic markers */
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    /* Remove inline code and code fences */
    .replace(/```[\s\S]*?```/g, "code block omitted")
    .replace(/`([^`]+)`/g, "$1")
    /* Remove blockquote markers */
    .replace(/^>\s+/gm, "")
    /* Remove horizontal rules */
    .replace(/^-{3,}$/gm, "")
    .replace(/^\*{3,}$/gm, "")
    /* Convert unordered list bullets to natural pauses */
    .replace(/^[\s]*[-*+]\s+/gm, "")
    /* Convert numbered lists */
    .replace(/^[\s]*\d+\.\s+/gm, "")
    /* Remove links but keep text */
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    /* Remove raw URLs */
    .replace(/https?:\/\/\S+/g, "")
    /* Remove HTML tags */
    .replace(/<[^>]+>/g, "")
    /* Remove emojis (Unicode ranges) */
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{FE00}-\u{FEFF}]/gu, "")
    /* Remove special symbols that don't vocalize well */
    .replace(/[#*_~^|\\]/g, "")
    /* Clean up multiple spaces and blank lines */
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    /* Trim */
    .trim()
}

export async function textToSpeech(text: string, voiceId?: string): Promise<Buffer> {
  const voice   = voiceId ?? DEFAULT_VOICE
  const cleaned = cleanTextForSpeech(text)

  /* Skip TTS if nothing meaningful remains after cleaning */
  if (!cleaned || cleaned.length < 2) return Buffer.alloc(0)

  const tts = new MsEdgeTTS()
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)

  const chunks: Buffer[] = []
  const { audioStream } = tts.toStream(cleaned)

  await new Promise<void>((resolve, reject) => {
    audioStream.on("data",  (c: Buffer) => chunks.push(Buffer.from(c)))
    audioStream.on("end",   resolve)
    audioStream.on("error", reject)
  })

  return Buffer.concat(chunks)
}

export function getVoices() {
  return EDGE_TTS_VOICES
}
