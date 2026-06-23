"use client"

import { useState, useEffect, useRef } from "react"
import {
  Lock, Palette, Layers, Zap, Smartphone, Star, Bell,
  Sun, Target, Plus, Trash2, Edit3, X, Check, Crown,
  Sparkles, ChevronRight, ImagePlus, Rocket,
  ArrowUp, Blend, ZoomIn, RefreshCw,
} from "lucide-react"
import {
  loadLockSettings, saveLockSettings, LOCK_WALLPAPERS,
  loadGoals, saveGoals, loadReminders, saveReminders,
  loadCustomLockWallpaper, saveCustomLockWallpaper, clearCustomLockWallpaper,
  type LockScreenSettings, type LockGoal, type LockReminder,
  type LockWallpaper, type BlurStrength, type UnlockAnimation, type LockClockStyle,
} from "@/lib/lock-screen-settings"
import { hasAtLeast, getPremiumTier } from "@/lib/quota"
import { cn } from "@/lib/utils"

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      className={cn(
        "relative h-7 w-12 rounded-full transition-colors duration-200",
        on && !disabled ? "bg-primary" : "bg-muted",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <span className={cn(
        "absolute top-0.5 size-6 rounded-full bg-white shadow-md transition-transform duration-200",
        on ? "translate-x-5" : "translate-x-0.5",
      )} />
    </button>
  )
}

function PremiumGate({
  plan, label, desc, enabled, onToggle, navigate,
}: {
  plan: string
  label: string
  desc: string
  enabled: boolean
  onToggle: () => void
  navigate?: (s: "paywall") => void
}) {
  const has = plan === "pro" ? hasAtLeast("pro") : plan === "plus" ? hasAtLeast("plus") : hasAtLeast("ultra")
  const planColors: Record<string, string> = {
    pro: "#4a9eff", plus: "#a855f7", ultra: "#f59e0b",
  }
  const PlanIcon = plan === "ultra" ? Crown : plan === "plus" ? Rocket : Zap

  return (
    <div className={cn(
      "flex w-full items-center justify-between rounded-xl px-3 py-3",
      !has && "opacity-70",
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <span
            className="shrink-0 flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5 border"
            style={{ color: planColors[plan], borderColor: planColors[plan] + "60" }}
          >
            <PlanIcon className="size-2.5" />
            {plan.toUpperCase()}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
        {!has && (
          <button
            onClick={() => navigate?.("paywall")}
            className="mt-1 text-[11px] font-semibold text-primary hover:opacity-80 flex items-center gap-1"
          >
            Upgrade to unlock <ChevronRight className="size-3" />
          </button>
        )}
      </div>
      <Toggle on={enabled && has} onToggle={has ? onToggle : () => navigate?.("paywall")} />
    </div>
  )
}

/* ── Goals manager ───────────────────────────────────────────── */
function GoalsManager() {
  const [goals,     setGoals]     = useState<LockGoal[]>([])
  const [editing,   setEditing]   = useState<LockGoal | null>(null)
  const [newTitle,  setNewTitle]  = useState("")
  const [newProg,   setNewProg]   = useState(0)
  const [showForm,  setShowForm]  = useState(false)

  useEffect(() => { setGoals(loadGoals()) }, [])

  const save = (g: LockGoal[]) => { setGoals(g); saveGoals(g) }

  const addOrUpdate = () => {
    if (!newTitle.trim()) return
    if (editing) {
      save(goals.map(g => g.id === editing.id ? { ...g, title: newTitle.trim(), progress: newProg } : g))
    } else {
      save([...goals, { id: Date.now().toString(), title: newTitle.trim(), progress: newProg }])
    }
    setNewTitle(""); setNewProg(0); setEditing(null); setShowForm(false)
  }

  const remove = (id: string) => save(goals.filter(g => g.id !== id))

  const startEdit = (g: LockGoal) => {
    setEditing(g); setNewTitle(g.title); setNewProg(g.progress); setShowForm(true)
  }

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground">Goals ({goals.length})</p>
        <button onClick={() => { setEditing(null); setNewTitle(""); setNewProg(0); setShowForm(true) }}
          className="flex items-center gap-1 text-xs text-primary font-semibold">
          <Plus className="size-3.5" /> Add
        </button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-xl border border-border bg-background p-3 space-y-2">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Goal title…"
            className="w-full text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">Progress:</span>
            <input type="range" min={0} max={100} value={newProg} onChange={e => setNewProg(Number(e.target.value))}
              className="flex-1 accent-primary" />
            <span className="text-xs font-bold text-primary w-8 text-right">{newProg}%</span>
          </div>
          <div className="flex gap-2">
            <button onClick={addOrUpdate} className="flex-1 rounded-full bg-primary py-1.5 text-xs font-bold text-primary-foreground">
              {editing ? "Update" : "Add Goal"}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null) }}
              className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No goals yet. Add your first goal above.</p>
      ) : (
        <div className="space-y-2">
          {goals.map(g => (
            <div key={g.id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium text-foreground truncate">{g.title}</span>
                  <span className="text-[11px] text-muted-foreground ml-1 shrink-0">{g.progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-accent overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${g.progress}%` }} />
                </div>
              </div>
              <button onClick={() => startEdit(g)} className="text-muted-foreground hover:text-primary p-1"><Edit3 className="size-3.5" /></button>
              <button onClick={() => remove(g.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Reminders manager ───────────────────────────────────────── */
function RemindersManager() {
  const [rems,      setRems]      = useState<LockReminder[]>([])
  const [newText,   setNewText]   = useState("")
  const [newTime,   setNewTime]   = useState("09:00")
  const [showForm,  setShowForm]  = useState(false)

  useEffect(() => { setRems(loadReminders()) }, [])

  const save = (r: LockReminder[]) => { setRems(r); saveReminders(r) }

  const add = () => {
    if (!newText.trim()) return
    save([...rems, { id: Date.now().toString(), text: newText.trim(), time: newTime }])
    setNewText(""); setNewTime("09:00"); setShowForm(false)
  }

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-foreground">Reminders ({rems.length})</p>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-xs text-primary font-semibold">
          <Plus className="size-3.5" /> Add
        </button>
      </div>

      {showForm && (
        <div className="mb-3 rounded-xl border border-border bg-background p-3 space-y-2">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="Reminder text…"
            className="w-full text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Time:</span>
            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
              className="flex-1 text-sm bg-background border border-border rounded-xl px-3 py-1.5 text-foreground outline-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={add} className="flex-1 rounded-full bg-primary py-1.5 text-xs font-bold text-primary-foreground">Add Reminder</button>
            <button onClick={() => setShowForm(false)} className="rounded-full border border-border px-4 py-1.5 text-xs text-muted-foreground">Cancel</button>
          </div>
        </div>
      )}

      {rems.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No reminders yet.</p>
      ) : (
        <div className="space-y-1.5">
          {rems.map(r => (
            <div key={r.id} className="flex items-center gap-2 rounded-xl bg-accent/30 px-2.5 py-2">
              <span className="text-xs text-primary tabular-nums w-10 shrink-0">{r.time}</span>
              <span className="flex-1 text-xs text-foreground truncate">{r.text}</span>
              <button onClick={() => save(rems.filter(x => x.id !== r.id))} className="text-muted-foreground hover:text-destructive"><X className="size-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   MAIN PANEL
   ════════════════════════════════════════════════════════════════ */
export function LockScreenSettingsPanel({
  navigate,
}: {
  navigate?: (s: "paywall") => void
}) {
  const [s, setS] = useState<LockScreenSettings>(() => loadLockSettings())

  const update = <K extends keyof LockScreenSettings>(key: K, val: LockScreenSettings[K]) => {
    const next = { ...s, [key]: val }
    setS(next)
    saveLockSettings(next)
  }

  /* ── Wallpaper section ──────────────────────────────────────── */
  function WallpaperPicker() {
    const fileRef = useRef<HTMLInputElement>(null)
    const [customPreview, setCustomPreview] = useState<string | null>(() => loadCustomLockWallpaper())

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        saveCustomLockWallpaper(dataUrl)
        setCustomPreview(dataUrl)
        update("wallpaper", "custom")
      }
      reader.readAsDataURL(file)
      e.target.value = ""
    }

    function removeCustom() {
      clearCustomLockWallpaper()
      setCustomPreview(null)
      if (s.wallpaper === "custom") update("wallpaper", "default")
    }

    const presetEntries = (Object.entries(LOCK_WALLPAPERS) as [LockWallpaper, typeof LOCK_WALLPAPERS[LockWallpaper]][])
      .filter(([key]) => key !== "custom")

    return (
      <div className="px-3 py-3">
        <p className="text-sm font-medium text-foreground mb-2.5">Lock Screen Wallpaper</p>

        {/* Upload from gallery */}
        <div className="mb-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {customPreview ? (
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "relative h-16 w-10 rounded-xl overflow-hidden shrink-0 transition-all",
                  s.wallpaper === "custom" && "ring-2 ring-primary ring-offset-2",
                )}
                style={{ backgroundImage: `url(${customPreview})`, backgroundSize: "cover", backgroundPosition: "center" }}
              >
                <button
                  onClick={() => update("wallpaper", "custom")}
                  className="absolute inset-0"
                />
                {s.wallpaper === "custom" && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex size-5 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                      <Check className="size-3 text-white" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">My Photo</p>
                <p className="text-[11px] text-muted-foreground">Custom wallpaper from gallery</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl bg-accent/60 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-accent active:scale-95 transition-all"
                >
                  Change
                </button>
                <button
                  onClick={removeCustom}
                  className="rounded-xl bg-red-500/15 px-3 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/25 active:scale-95 transition-all"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-accent/20 px-4 py-3 text-left transition-all hover:bg-accent/40 active:scale-[0.99]"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <ImagePlus className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Add from Gallery</p>
                <p className="text-[11px] text-muted-foreground">Use your own photo as wallpaper</p>
              </div>
            </button>
          )}
        </div>

        {/* Preset grid */}
        <div className="grid grid-cols-4 gap-2">
          {presetEntries.map(([key, wp]) => (
            <button
              key={key}
              onClick={() => update("wallpaper", key)}
              className={cn(
                "relative h-16 rounded-xl overflow-hidden transition-transform active:scale-95",
                s.wallpaper === key && "ring-2 ring-primary ring-offset-2",
              )}
              style={{ background: `linear-gradient(to bottom, ${wp.preview[0]}, ${wp.preview[1]})` }}
            >
              {s.wallpaper === key && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex size-5 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                    <Check className="size-3 text-white" />
                  </div>
                </div>
              )}
              <p className="absolute bottom-1 inset-x-0 text-center text-[9px] font-semibold text-white/70">{wp.label}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ── Blur section ───────────────────────────────────────────── */
  function BlurPicker() {
    const options: { val: BlurStrength; label: string; desc: string }[] = [
      { val: "none",   label: "None",   desc: "No blur" },
      { val: "light",  label: "Light",  desc: "Subtle" },
      { val: "medium", label: "Medium", desc: "iOS-style" },
      { val: "heavy",  label: "Heavy",  desc: "Frosted" },
    ]
    return (
      <div className="px-3 py-3">
        <p className="text-sm font-medium text-foreground mb-2">Blur Effect</p>
        <div className="grid grid-cols-4 gap-1.5">
          {options.map(o => (
            <button
              key={o.val}
              onClick={() => update("blurStrength", o.val)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors",
                s.blurStrength === o.val
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/50",
              )}
            >
              <span className="text-xs font-semibold">{o.label}</span>
              <span className="text-[9px]">{o.desc}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ── Animation section ──────────────────────────────────────── */
  function AnimationPicker() {
    const options: { val: UnlockAnimation; label: string; Icon: React.ElementType }[] = [
      { val: "slide",  label: "Slide",  Icon: ArrowUp  },
      { val: "fade",   label: "Fade",   Icon: Blend    },
      { val: "scale",  label: "Scale",  Icon: ZoomIn   },
      { val: "spring", label: "Spring", Icon: RefreshCw },
    ]
    return (
      <div className="px-3 py-3">
        <p className="text-sm font-medium text-foreground mb-2">Unlock Animation</p>
        <div className="grid grid-cols-4 gap-1.5">
          {options.map(o => (
            <button
              key={o.val}
              onClick={() => update("unlockAnimation", o.val)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors",
                s.unlockAnimation === o.val
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/50",
              )}
            >
              <o.Icon className="size-4" />
              <span className="text-[10px] font-semibold">{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  /* ── Clock style section ─────────────────────────────────────── */
  function ClockStylePicker() {
    const options: { val: LockClockStyle; label: string; preview: string }[] = [
      { val: "thin",  label: "Thin",  preview: "font-thin"              },
      { val: "bold",  label: "Bold",  preview: "font-black"             },
      { val: "mono",  label: "Mono",  preview: "font-mono font-medium"  },
      { val: "serif", label: "Serif", preview: "font-serif italic"      },
    ]
    const hour = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    return (
      <div className="px-3 py-3">
        <p className="text-sm font-medium text-foreground mb-2">Clock Font</p>
        <div className="grid grid-cols-4 gap-1.5">
          {options.map(o => (
            <button
              key={o.val}
              onClick={() => update("clockStyle", o.val)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-colors",
                s.clockStyle === o.val
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-accent/50",
              )}
            >
              <span className={cn("text-[15px] tabular-nums leading-tight", o.preview)}>{hour}</span>
              <span className="text-[10px] font-semibold mt-0.5">{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">

      {/* ── FREE FEATURES ── */}
      <div className="flex items-center gap-2 px-1 pb-1.5 pt-2">
        <Palette className="size-4 text-primary" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Appearance</p>
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border/50">
        <WallpaperPicker />
        <ClockStylePicker />
        <BlurPicker />
        <AnimationPicker />
        <div className="flex w-full items-center justify-between px-3 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Quick Apps</p>
            <p className="text-[11px] text-muted-foreground">Flashlight &amp; Camera on lock screen</p>
          </div>
          <Toggle on={s.quickApps} onToggle={() => update("quickApps", !s.quickApps)} />
        </div>
        <div className="flex w-full items-center justify-between px-3 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Notification Preview</p>
            <p className="text-[11px] text-muted-foreground">Show recent LEX replies on lock screen</p>
          </div>
          <Toggle on={s.notifPreview} onToggle={() => update("notifPreview", !s.notifPreview)} />
        </div>
      </div>

      {/* ── PREMIUM FEATURES ── */}
      <div className="flex items-center gap-2 px-1 pb-1.5 pt-4">
        <Crown className="size-4 text-primary" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Premium Lock Screen</p>
      </div>
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border/50">
        <PremiumGate
          plan="pro" label="AI Widgets" navigate={navigate}
          desc="Detailed weather, battery and day overview"
          enabled={s.aiWidgets} onToggle={() => update("aiWidgets", !s.aiWidgets)}
        />
        <PremiumGate
          plan="pro" label="Context Cards" navigate={navigate}
          desc="LEX shows smart context based on time &amp; habits"
          enabled={s.contextCards} onToggle={() => update("contextCards", !s.contextCards)}
        />
        <PremiumGate
          plan="plus" label="Smart Reminders" navigate={navigate}
          desc="Upcoming reminders shown on lock screen"
          enabled={s.smartReminders} onToggle={() => update("smartReminders", !s.smartReminders)}
        />
        <PremiumGate
          plan="plus" label="Daily Briefing" navigate={navigate}
          desc="Morning weather and goal summary card"
          enabled={s.dailyBriefing} onToggle={() => update("dailyBriefing", !s.dailyBriefing)}
        />
        <PremiumGate
          plan="ultra" label="Goal Tracking" navigate={navigate}
          desc="Goal progress bars visible on lock screen"
          enabled={s.goalTracking} onToggle={() => update("goalTracking", !s.goalTracking)}
        />
      </div>

      {/* ── GOALS DATA (Ultra) ── */}
      {hasAtLeast("ultra") && s.goalTracking && (
        <>
          <div className="flex items-center gap-2 px-1 pb-1.5 pt-4">
            <Target className="size-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Manage Goals</p>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <GoalsManager />
          </div>
        </>
      )}

      {/* ── REMINDERS DATA (Plus+) ── */}
      {hasAtLeast("plus") && s.smartReminders && (
        <>
          <div className="flex items-center gap-2 px-1 pb-1.5 pt-4">
            <Bell className="size-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Manage Reminders</p>
          </div>
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <RemindersManager />
          </div>
        </>
      )}
    </div>
  )
}
