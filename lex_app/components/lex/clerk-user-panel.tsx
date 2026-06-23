"use client"

import { useUser, useClerk } from "@clerk/nextjs"
import { LogOut, User, ChevronRight, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClerkUserPanelProps {
  onSignIn?: () => void
}

export function ClerkUserPanel({ onSignIn }: ClerkUserPanelProps) {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut, openUserProfile } = useClerk()

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 animate-pulse">
        <div className="size-10 rounded-full bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-2.5 w-32 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (isSignedIn && user) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => openUserProfile()}
          className="flex w-full items-center gap-3 px-4 py-3.5 hover:bg-accent/50 active:bg-accent/70 transition-colors text-left"
        >
          {user.imageUrl ? (
            <img
              src={user.imageUrl}
              alt={user.fullName ?? "User"}
              className="size-10 rounded-full object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <User className="size-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {user.fullName ?? user.username ?? "LEX User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user.primaryEmailAddress?.emailAddress ?? ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
              <ShieldCheck className="size-3" />
              Verified
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
        </button>

        <div className="border-t border-border">
          <button
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="flex w-full items-center gap-3 px-4 py-3 hover:bg-red-500/5 active:bg-red-500/10 transition-colors text-left"
          >
            <LogOut className="size-4 text-red-400" />
            <span className="text-sm text-red-400">Sign out</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <User className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Not signed in</p>
            <p className="text-xs text-muted-foreground">Sign in to sync your data</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSignIn}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Sign in
          </button>
          <button
            onClick={() => { window.location.href = "/sign-up" }}
            className="flex-1 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground hover:bg-accent/50 active:scale-[0.98] transition-all"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  )
}
