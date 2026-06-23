import { NextRequest, NextResponse } from "next/server"

const WMO: Record<number, { label: string; icon: string }> = {
  0:  { label: "Clear sky",       icon: "☀️"  },
  1:  { label: "Mainly clear",    icon: "🌤️"  },
  2:  { label: "Partly cloudy",   icon: "⛅"  },
  3:  { label: "Overcast",        icon: "☁️"  },
  45: { label: "Foggy",           icon: "🌫️"  },
  48: { label: "Icy fog",         icon: "🌫️"  },
  51: { label: "Light drizzle",   icon: "🌦️"  },
  53: { label: "Drizzle",         icon: "🌧️"  },
  55: { label: "Heavy drizzle",   icon: "🌧️"  },
  61: { label: "Light rain",      icon: "🌧️"  },
  63: { label: "Rain",            icon: "🌧️"  },
  65: { label: "Heavy rain",      icon: "🌧️"  },
  71: { label: "Light snow",      icon: "❄️"  },
  73: { label: "Snow",            icon: "❄️"  },
  75: { label: "Heavy snow",      icon: "❄️"  },
  77: { label: "Snow grains",     icon: "❄️"  },
  80: { label: "Rain showers",    icon: "🌦️"  },
  81: { label: "Heavy showers",   icon: "⛈️"  },
  82: { label: "Violent showers", icon: "⛈️"  },
  85: { label: "Snow showers",    icon: "❄️"  },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm",    icon: "⛈️"  },
  96: { label: "Thunderstorm w/ hail", icon: "⛈️" },
  99: { label: "Thunderstorm w/ heavy hail", icon: "⛈️" },
}

/** Fetch with automatic retry on transient failures */
async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  let lastErr: unknown
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res
      if (res.status >= 400 && res.status < 500) throw new Error(`HTTP ${res.status}`)
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (e) {
      lastErr = e
      if (i < retries) await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw lastErr
}

export async function GET(req: NextRequest) {
  const lat   = req.nextUrl.searchParams.get("lat")
  const lng   = req.nextUrl.searchParams.get("lng")
  const cityQ = req.nextUrl.searchParams.get("city")
  const unit  = req.nextUrl.searchParams.get("unit") ?? "celsius"   // celsius | fahrenheit

  /* ── City geocode search ──────────────────────────────────────── */
  if (cityQ && !lat && !lng) {
    try {
      const geo = await fetchWithRetry(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQ)}&format=json&limit=5&addressdetails=1`,
        { headers: { "User-Agent": "LEX-Launcher/1.0 (contact@lex.ai)" } },
      )
      const results = await geo.json()
      return NextResponse.json({
        geocode: results.map((r: Record<string, string>) => ({
          name: r.display_name,
          lat:  r.lat,
          lng:  r.lon,
        })),
      })
    } catch {
      return NextResponse.json({ error: "Geocode failed — check your connection" }, { status: 503 })
    }
  }

  /* ── Weather fetch ────────────────────────────────────────────── */
  const resolvedLat = lat ?? "51.5074"
  const resolvedLng = lng ?? "-0.1278"

  try {
    const tempUnit      = unit === "fahrenheit" ? "fahrenheit" : "celsius"
    const windUnit      = "kmh"

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${resolvedLat}&longitude=${resolvedLng}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relative_humidity_2m,precipitation,is_day` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode` +
      `&temperature_unit=${tempUnit}` +
      `&wind_speed_unit=${windUnit}` +
      `&timezone=auto&forecast_days=3`

    const res  = await fetchWithRetry(url, { next: { revalidate: 1800 } })
    const data = await res.json()

    if (!data?.current) {
      throw new Error("Malformed response from Open-Meteo")
    }

    const code  = data.current.weathercode as number
    const cond  = WMO[code] ?? WMO[Math.floor(code / 10) * 10] ?? { label: "Unknown", icon: "🌡️" }
    const isDay = data.current.is_day === 1

    /* Adjust icon for night */
    let icon = cond.icon
    if (!isDay && code === 0)  icon = "🌙"
    if (!isDay && code === 1)  icon = "🌙"
    if (!isDay && code === 2)  icon = "🌓"

    /* ── Reverse geocode ──────────────────────────────────────────── */
    let city    = "Your Location"
    let country = ""
    let timezone = (data.timezone as string) ?? ""

    try {
      const geo = await fetchWithRetry(
        `https://nominatim.openstreetmap.org/reverse?lat=${resolvedLat}&lon=${resolvedLng}&format=json&zoom=10`,
        { headers: { "User-Agent": "LEX-Launcher/1.0 (contact@lex.ai)" }, next: { revalidate: 86400 } },
      )
      const gd = await geo.json()
      city =
        gd.address?.city      ??
        gd.address?.town      ??
        gd.address?.village   ??
        gd.address?.suburb    ??
        gd.address?.county    ??
        gd.address?.state     ??
        "Your Location"
      country = gd.address?.country_code?.toUpperCase() ?? ""
    } catch { /* keep defaults — weather still works */ }

    /* ── 3-day forecast ──────────────────────────────────────────── */
    const forecast = (data.daily?.time ?? []).slice(0, 3).map((date: string, i: number) => {
      const dCode = data.daily.weathercode?.[i] ?? 0
      const dCond = WMO[dCode] ?? { label: "Unknown", icon: "🌡️" }
      return {
        date,
        high:  Math.round(data.daily.temperature_2m_max?.[i] ?? 0),
        low:   Math.round(data.daily.temperature_2m_min?.[i] ?? 0),
        icon:  dCond.icon,
        label: dCond.label,
        precip: Math.round((data.daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
      }
    })

    return NextResponse.json({
      temp:       Math.round(data.current.temperature_2m),
      feelsLike:  Math.round(data.current.apparent_temperature),
      humidity:   Math.round(data.current.relative_humidity_2m),
      wind:       Math.round(data.current.windspeed_10m),
      precip:     Math.round((data.current.precipitation ?? 0) * 10) / 10,
      label:      cond.label,
      icon,
      high:       Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
      low:        Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
      city,
      country,
      timezone,
      lat:        resolvedLat,
      lng:        resolvedLng,
      unit:       tempUnit === "fahrenheit" ? "°F" : "°C",
      windUnit:   "km/h",
      isDay,
      forecast,
    })
  } catch (err) {
    console.error("[weather]", err)
    return NextResponse.json(
      { error: "Weather data unavailable — please try again shortly" },
      { status: 503 },
    )
  }
}
