"use client"

import React from "react"
import { cn } from "@/lib/utils"

type Props = { text: string; className?: string }

function parseInline(segment: string, keyBase: string): React.ReactNode[] {
  const parts = segment.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)/g)
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={`${keyBase}-s-${i}`} className="font-semibold">{p.slice(2, -2)}</strong>
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={`${keyBase}-e-${i}`} className="italic">{p.slice(1, -1)}</em>
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <code key={`${keyBase}-c-${i}`} className="rounded bg-black/20 px-1 py-0.5 font-mono text-[0.85em] text-foreground/90">
          {p.slice(1, -1)}
        </code>
      )
    if (p.startsWith("~~") && p.endsWith("~~"))
      return <s key={`${keyBase}-del-${i}`}>{p.slice(2, -2)}</s>
    return p
  })
}

export function Markdown({ text, className }: Props) {
  if (!text) return null

  const blocks: React.ReactNode[] = []
  const lines = text.split("\n")
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]
    const k = String(key++)

    /* ── fenced code block ── */
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push(
        <pre key={k} className="my-2 overflow-x-auto rounded-xl bg-black/30 px-3 py-2.5 text-[11px] font-mono leading-relaxed border border-white/5">
          {lang && (
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-foreground/40">
              {lang}
            </span>
          )}
          <code className="text-foreground/90">{codeLines.join("\n")}</code>
        </pre>
      )
      i++
      continue
    }

    /* ── horizontal rule ── */
    if (/^[-*_]{3,}$/.test(line.trim())) {
      blocks.push(<hr key={k} className="my-2 border-border/30" />)
      i++
      continue
    }

    /* ── headings ── */
    if (line.startsWith("### ")) {
      blocks.push(
        <p key={k} className="mt-2 mb-0.5 text-sm font-semibold text-foreground/95">
          {parseInline(line.slice(4), k)}
        </p>
      )
      i++
      continue
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <p key={k} className="mt-2 mb-0.5 text-[13px] font-bold text-foreground">
          {parseInline(line.slice(3), k)}
        </p>
      )
      i++
      continue
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <p key={k} className="mt-2 mb-1 text-sm font-bold text-foreground">
          {parseInline(line.slice(2), k)}
        </p>
      )
      i++
      continue
    }

    /* ── blockquote ── */
    if (line.startsWith("> ")) {
      blocks.push(
        <div key={k} className="my-1 border-l-2 border-primary/50 pl-3 text-foreground/70 italic text-[13px]">
          {parseInline(line.slice(2), k)}
        </div>
      )
      i++
      continue
    }

    /* ── unordered list ── */
    if (/^[-*+] /.test(line)) {
      const items: React.ReactNode[] = []
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        const ik = `${k}-li-${items.length}`
        items.push(
          <li key={ik} className="flex gap-2 leading-relaxed">
            <span className="mt-[7px] size-[5px] shrink-0 rounded-full bg-foreground/40" />
            <span>{parseInline(lines[i].replace(/^[-*+] /, ""), ik)}</span>
          </li>
        )
        i++
      }
      blocks.push(
        <ul key={k} className="my-1 space-y-0.5 text-sm">
          {items}
        </ul>
      )
      continue
    }

    /* ── ordered list ── */
    if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = []
      let n = 1
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const ik = `${k}-ol-${items.length}`
        items.push(
          <li key={ik} className="flex gap-2 leading-relaxed">
            <span className="shrink-0 font-semibold text-foreground/50 tabular-nums min-w-[1.2em]">{n++}.</span>
            <span>{parseInline(lines[i].replace(/^\d+\. /, ""), ik)}</span>
          </li>
        )
        i++
      }
      blocks.push(
        <ol key={k} className="my-1 space-y-0.5 text-sm">
          {items}
        </ol>
      )
      continue
    }

    /* ── empty line ── */
    if (line.trim() === "") {
      i++
      continue
    }

    /* ── paragraph (collect adjacent non-special lines) ── */
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6} |[-*+] |\d+\. |> |```|[-*_]{3,}$)/.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push(
        <p key={k} className="leading-relaxed text-sm">
          {paraLines.flatMap((pl, j) => [
            ...(j > 0 ? [" "] : []),
            ...parseInline(pl, `${k}-p-${j}`),
          ])}
        </p>
      )
    }
  }

  return (
    <div className={cn("space-y-[3px]", className)}>
      {blocks}
    </div>
  )
}
