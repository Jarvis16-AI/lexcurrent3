import { NextRequest, NextResponse } from "next/server"

const WMO: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Icy fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Drizzle", icon: "🌧️" },
  55: { label: "Heavy drizzle", icon: "🌧️" },
  61: { label: "Light rain", icon: "🌧️" },
  63: { label: "Rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  71: { label: "Light snow", icon: "❄️" },
  73: { label: "Snow", icon: "❄️" },
  75: { label: "Heavy snow", icon: "❄️" },
  80: { label: "Rain showers", icon: "🌦️" },
  81: { label: "Heavy showers", icon: "⛈️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  99: { label: "Thunderstorm", icon: "⛈️" },
}

export async function GET(req: NextRequest) {
  const lat     = req.nextUrl.searchParams.get("lat")
  const lng     = req.nextUrl.searchParams.get("lng")
  const cityQ   = req.nextUrl.searchParams.get("city")

  // If city search query provided, geocode it first
  if (cityQ && !lat && !lng) {
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQ)}&format=json&limit=5`,
        { headers: { "User-Agent": "LEX-Launcher/1.0" } }
      )
      const results = await geo.json()
      return NextResponse.json({ geocode: results.map((r: Record<string, string>) => ({
        name: r.display_name,
        lat:  r.lat,
        lng:  r.lon,
      }))})
    } catch {
      return NextResponse.json({ error: "Geocode failed" }, { status: 500 })
    }
  }

  // Use provided coords or London as neutral fallback
  const resolvedLat = lat ?? "51.5074"
  const resolvedLng = lng ?? "-0.1278"

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${resolvedLat}&longitude=${resolvedLng}` +
      `&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relative_humidity_2m` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&timezone=auto&forecast_days=1`

    const res = await fetch(url, { next: { revalidate: 1800 } })
    if (!res.ok) throw new Error("Open-Meteo error")
    const data = await res.json()

    const code = data.current.weathercode as number
    const cond = WMO[code] ?? { label: "Unknown", icon: "🌡️" }

    let city = "Your Location"
    let country = ""
    let timezone = data.timezone as string ?? ""
    try {
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${resolvedLat}&lon=${resolvedLng}&format=json`,
        { headers: { "User-Agent": "LEX-Launcher/1.0" }, next: { revalidate: 86400 } }
      )
      const gd = await geo.json()
      city =
        gd.address?.city ??
        gd.address?.town ??
        gd.address?.village ??
        gd.address?.county ??
        gd.address?.state ??
        "Your Location"
      country = gd.address?.country_code?.toUpperCase() ?? ""
    } catch { /* keep default */ }

    return NextResponse.json({
      temp:      Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity:  Math.round(data.current.relative_humidity_2m),
      wind:      Math.round(data.current.windspeed_10m),
      label:     cond.label,
      icon:      cond.icon,
      high:      Math.round(data.daily.temperature_2m_max[0]),
      low:       Math.round(data.daily.temperature_2m_min[0]),
      city,
      country,
      timezone,
      lat:       resolvedLat,
      lng:       resolvedLng,
      unit:      "°C",
    })
  } catch (err) {
    console.error("[weather]", err)
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 })
  }
}
