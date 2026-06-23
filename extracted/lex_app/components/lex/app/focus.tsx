"use client"

import { useState } from "react"
import { ChevronLeft, Plus, CheckCircle2, Circle, ListChecks, Trash2 } from "lucide-react"
import type { AppShared, Task } from "./types"
import { cn } from "@/lib/utils"

const INITIAL_TASKS: Task[] = []

function StatusBar({ time }: { time: Date | null }) {
  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
  return (
    <div className="flex items-center justify-between px-6 pt-4 text-foreground">
      <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
      <span className="text-[11px] font-semibold text-primary">Focus</span>
    </div>
  )
}

export function FocusScreen({ goBack, time, sendMessage }: AppShared) {
  const [tasks,    setTasks]    = useState<Task[]>(INITIAL_TASKS)
  const [newTask,  setNewTask]  = useState("")
  const [filter,   setFilter]   = useState<"all" | "today" | "done">("all")

  const pending = tasks.filter(t => !t.done).length
  const done    = tasks.filter(t => t.done).length

  const toggle = (id: number) =>
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))

  const addTask = () => {
    if (!newTask.trim()) return
    setTasks(ts => [
      ...ts,
      { id: Date.now(), text: newTask.trim(), done: false },
    ])
    setNewTask("")
  }

  const remove = (id: number) =>
    setTasks(ts => ts.filter(t => t.id !== id))

  const visible = tasks.filter(t =>
    filter === "all"   ? true :
    filter === "done"  ? t.done :
    !t.done,
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <StatusBar time={time} />

      {/* header */}
      <div className="flex items-center gap-3 px-5 pt-3 pb-1">
        <button
          onClick={goBack}
          className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="leading-tight">
          <h2 className="text-xl font-bold text-foreground">Focus</h2>
          <p className="text-xs text-muted-foreground">{pending} remaining · {done} done</p>
        </div>
      </div>

      {/* quick stats */}
      <div className="mx-5 mt-3 grid grid-cols-2 gap-2">
        {[
          { icon: <ListChecks className="size-4 text-primary" />, label: `${pending} Task${pending === 1 ? "" : "s"}`, sub: "remaining" },
          { icon: <CheckCircle2 className="size-4 text-green-500" />, label: `${done} Done`,  sub: "completed" },
        ].map(s => (
          <div key={s.label} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 shadow-sm">
            {s.icon}
            <span className="text-xs font-semibold text-foreground">{s.label}</span>
            <span className="text-[10px] text-muted-foreground">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* filter chips */}
      <div className="mt-3 flex gap-2 px-5">
        {(["all", "today", "done"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors capitalize",
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-accent/50 text-muted-foreground hover:bg-accent",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* task list */}
      <div className="mt-3 flex-1 overflow-y-auto space-y-2 px-5">
        {visible.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm group"
          >
            <button onClick={() => toggle(task.id)} className="shrink-0 active:scale-90 transition-transform">
              {task.done
                ? <CheckCircle2 className="size-5 text-primary" />
                : <Circle       className="size-5 text-muted-foreground" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium truncate", task.done && "line-through text-muted-foreground")}>
                {task.text}
              </p>
              {task.time && (
                <p className="text-[10px] text-muted-foreground">{task.time}</p>
              )}
            </div>
            <button
              onClick={() => remove(task.id)}
              className="shrink-0 text-muted-foreground/50 hover:text-destructive active:text-destructive active:scale-90 transition-all"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="flex flex-col items-center py-12 text-muted-foreground">
            <CheckCircle2 className="size-10 opacity-20 mb-3" />
            <p className="text-sm">All clear!</p>
          </div>
        )}
      </div>

      {/* add task */}
      <div className="px-5 pb-3 pt-2">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 shadow-sm">
          <input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTask()}
            placeholder="Add a task or idea…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={addTask}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90 transition-transform"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <button
          onClick={() => sendMessage("Give me a summary of my tasks and how to be more productive today")}
          className="mt-2 w-full rounded-2xl border border-border bg-accent/30 py-2.5 text-xs font-medium text-primary hover:bg-accent/60 transition-colors active:scale-[0.98]"
        >
          ✨ Ask LEX for productivity tips
        </button>
      </div>
    </div>
  )
}
