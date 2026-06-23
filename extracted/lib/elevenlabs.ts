import { ElevenLabsClient } from "elevenlabs"

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
})

const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"

export async function textToSpeech(text: string, voiceId?: string): Promise<Buffer> {
  const id = voiceId ?? DEFAULT_VOICE_ID

  const audio = await client.textToSpeech.convert(id, {
    text,
    model_id: "eleven_turbo_v2",
    voice_settings: {
      stability:        0.5,
      similarity_boost: 0.75,
      style:            0.2,
      use_speaker_boost: true,
    },
  })

  const chunks: Buffer[] = []
  for await (const chunk of audio) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export async function getVoices(): Promise<{ id: string; name: string; category?: string }[]> {
  const res = await client.voices.getAll()
  return res.voices.map(v => ({
    id:       v.voice_id,
    name:     v.name ?? "Unknown",
    category: v.category ?? undefined,
  }))
}
