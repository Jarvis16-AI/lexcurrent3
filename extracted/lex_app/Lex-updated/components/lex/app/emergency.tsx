"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronLeft, Phone, Plus, Trash2, Edit3, X, AlertTriangle,
  Shield, Star, User, Check,
} from "lucide-react"
import type { AppShared, EmergencyContact } from "./types"
import { cn } from "@/lib/utils"

function ContactCard({
  contact, onCall, onDelete, onEdit,
}: {
  contact: EmergencyContact
  onCall: (phone: string) => void
  onDelete: (id: number) => void
  onEdit: (c: EmergencyContact) => void
}) {
  const isPrimary = contact.priority === 1
  return (
    <div className={cn(
      "relative rounded-2xl border p-4 transition-all",
      isPrimary ? "border-red-500/40 bg-red-500/8" : "border-border/60 bg-card"
    )}>
      {isPrimary && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5">
          <Star className="size-3 text-red-400" />
          <span className="text-[10px] font-bold text-red-400">Primary</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "flex size-10 items-center justify-center rounded-full shrink-0",
          isPrimary ? "bg-red-500/20" : "bg-accent/60"
        )}>
          <User className={cn("size-5", isPrimary ? "text-red-400" : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{contact.name}</p>
          <p className="text-xs text-muted-foreground">{contact.relation || "Contact"}</p>
        </div>
      </div>

      <p className="text-base font-semibold text-foreground mb-3 pl-1">{contact.phone}</p>

      <div className="flex gap-2">
        <button
          onClick={() => onCall(contact.phone)}
          className="flex-1 flex items-center justify-center gap-2 rounded-full bg-green-500 py-2.5 text-sm font-bold text-white active:scale-95 transition-transform"
        >
          <Phone className="size-4" /> Call Now
        </button>
        <button onClick={() => onEdit(contact)} className="flex size-10 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90">
          <Edit3 className="size-4" />
        </button>
        <button onClick={() => onDelete(contact.id)} className="flex size-10 items-center justify-center rounded-full bg-accent/60 text-muted-foreground hover:text-destructive active:scale-90">
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

function ContactModal({
  contact, onClose, onSave,
}: {
  contact: Partial<EmergencyContact> | null
  onClose: () => void
  onSave: (data: Partial<EmergencyContact>) => void
}) {
  const [name, setName]       = useState(contact?.name ?? "")
  const [phone, setPhone]     = useState(contact?.phone ?? "")
  const [relation, setRelation] = useState(contact?.relation ?? "")
  const [priority, setPriority] = useState(contact?.priority ?? 2)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[390px] rounded-t-3xl bg-card border border-border/60 p-5 pb-8" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">{contact?.id ? "Edit Contact" : "Add Emergency Contact"}</h3>
          <button onClick={onClose}><X className="size-5 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <input
            value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Phone number (e.g. +260 977 000 000)"
            type="tel"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <input
            value={relation} onChange={e => setRelation(e.target.value)}
            placeholder="Relationship (e.g. Mother, Doctor)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Primary contact</p>
              <p className="text-[11px] text-muted-foreground">Shown first in emergencies</p>
            </div>
            <button
              onClick={() => setPriority(p => p === 1 ? 2 : 1)}
              className={cn("relative h-7 w-12 rounded-full transition-colors", priority === 1 ? "bg-red-500" : "bg-muted")}
            >
              <span className={cn("absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform", priority === 1 ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>
        </div>

        <button
          onClick={() => { if (name.trim() && phone.trim()) { onSave({ ...contact, name: name.trim(), phone: phone.trim(), relation: relation.trim(), priority }); onClose() } }}
          disabled={!name.trim() || !phone.trim()}
          className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          Save Contact
        </button>
      </div>
    </div>
  )
}

export function EmergencyScreen({ goBack, time }: AppShared) {
  const [contacts, setContacts]   = useState<EmergencyContact[]>([])
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState<Partial<EmergencyContact> | null>(null)
  const [showModal, setShowModal] = useState(false)

  const fmt = time ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/emergency?userId=local")
      const data = await res.json()
      setContacts(data.contacts ?? [])
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  const handleSave = async (data: Partial<EmergencyContact>) => {
    if (data.id) {
      await fetch("/api/emergency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "local", ...data }),
      })
    } else {
      await fetch("/api/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "local", ...data }),
      })
    }
    fetchContacts()
  }

  const handleDelete = async (id: number) => {
    setContacts(prev => prev.filter(c => c.id !== id))
    await fetch(`/api/emergency?id=${id}&userId=local`, { method: "DELETE" })
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const sorted = [...contacts].sort((a, b) => a.priority - b.priority)

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between px-6 pt-4 shrink-0 text-foreground">
        <span className="text-[13px] font-semibold tabular-nums">{fmt}</span>
        <span className="text-[11px] font-semibold text-red-500">Emergency</span>
      </div>

      <div className="flex items-center gap-3 px-5 pt-3 pb-3 shrink-0">
        <button onClick={goBack} className="flex size-9 items-center justify-center rounded-full bg-accent/60 text-muted-foreground active:scale-90 transition-transform">
          <ChevronLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Emergency Contacts</h1>
          <p className="text-[11px] text-muted-foreground">Quick-access in emergencies</p>
        </div>
        <button
          onClick={() => { setEditing({}); setShowModal(true) }}
          className="flex size-9 items-center justify-center rounded-full bg-red-500 text-white active:scale-90 transition-transform"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* SOS banner */}
      <div className="mx-5 mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="size-6 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-400">Emergency Mode</p>
            <p className="text-[11px] text-muted-foreground">Hold the LEX orb for 2 seconds to trigger this screen instantly.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-8 rounded-full border-2 border-red-500/30 border-t-red-500 animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-3">
            <AlertTriangle className="size-12 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-foreground">No emergency contacts yet</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">Add your most important contacts so LEX can reach them fast in an emergency.</p>
            <button
              onClick={() => { setEditing({}); setShowModal(true) }}
              className="mt-2 rounded-full bg-red-500 px-5 py-2 text-xs font-bold text-white"
            >
              Add First Contact
            </button>
          </div>
        ) : (
          sorted.map(c => (
            <ContactCard
              key={c.id} contact={c}
              onCall={handleCall}
              onDelete={handleDelete}
              onEdit={c => { setEditing(c); setShowModal(true) }}
            />
          ))
        )}
      </div>

      {showModal && (
        <ContactModal
          contact={editing}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
