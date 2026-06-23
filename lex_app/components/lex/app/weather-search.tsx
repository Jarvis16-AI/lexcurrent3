"use client"

import { useState, useRef, useEffect } from "react"
import { Search, X, MapPin, Loader2, Navigation } from "lucide-react"
import { cn } from "@/lib/utils"

interface GeoResult {
  name: string
  lat:  string
  lng:  string
}

interface WeatherSearchProps {
  onSelect: (lat: string, lng: string, label: string) => void
  onClose:  () => void
  onUseDevice: () => void
}

export function WeatherSearch({ onSelect, onClose, onUseDevice }: WeatherSearchProps) {
  const [query,    setQuery]    = useState("")
  const [results,  setResults]  = useState<GeoResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleChange(v: string) {
    setQuery(v)
    setError("")
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!v.trim()) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/weather?city=${encodeURIComponent(v.trim())}`)
        const data = await res.json()
        if (data.geocode) setResults(data.geocode.slice(0, 6))
        else setError("No results found.")
      } catch {
        setError("Search failed. Check your connection.")
      } finally {
        setLoading(false)
      }
    }, 500)
  }

  /* Shorten the long Nominatim display_name to city, country */
  function shortName(full: string) {
    const parts = full.split(",").map(s => s.trim())
    if (parts.length >= 3) return `${parts[0]}, ${parts[parts.length - 1]}`
    return parts.slice(0, 2).join(", ")
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md">
      {/* header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Search city or country…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]) }}>
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3">
        {/* Use device location */}
        <button
          onClick={() => { onUseDevice(); onClose() }}
          className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3 mb-4 transition-colors hover:bg-primary/15 active:scale-[0.98]"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20">
            <Navigation className="size-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Use my current location</p>
            <p className="text-[11px] text-muted-foreground">Requires location permission</p>
          </div>
        </button>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Searching…</span>
          </div>
        )}

        {error && !loading && (
          <p className="text-center text-sm text-muted-foreground py-8">{error}</p>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 pb-1">
              Results
            </p>
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => { onSelect(r.lat, r.lng, shortName(r.name)); onClose() }}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-accent/60 active:bg-accent border border-transparent hover:border-border/40"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <MapPin className="size-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{shortName(r.name)}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{r.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && results.length === 0 && query && (
          <p className="text-center text-sm text-muted-foreground py-8">No results yet…</p>
        )}

        {!query && !loading && (
          <div className="py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 pb-2">
              Popular cities
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "London, UK",         lat: "51.5074",  lng: "-0.1278"  },
                { label: "New York, US",        lat: "40.7128",  lng: "-74.0060" },
                { label: "Tokyo, Japan",        lat: "35.6762",  lng: "139.6503" },
                { label: "Dubai, UAE",          lat: "25.2048",  lng: "55.2708"  },
                { label: "Paris, France",       lat: "48.8566",  lng: "2.3522"   },
                { label: "Sydney, Australia",   lat: "-33.8688", lng: "151.2093" },
                { label: "Nairobi, Kenya",      lat: "-1.2921",  lng: "36.8219"  },
                { label: "São Paulo, Brazil",   lat: "-23.5505", lng: "-46.6333" },
              ].map(c => (
                <button
                  key={c.label}
                  onClick={() => { onSelect(c.lat, c.lng, c.label); onClose() }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border border-border/50 bg-card px-3 py-2.5",
                    "text-left text-sm font-medium text-foreground transition-colors",
                    "hover:bg-accent/60 active:scale-[0.97]",
                  )}
                >
                  <MapPin className="size-3.5 text-primary shrink-0" />
                  <span className="truncate text-xs">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
