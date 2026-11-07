"use client";

import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Cover } from "@/components/ui/cover";
import { IDEA_KINDS, topicStyle } from "@/features/shared/topics";
import { timeAgo } from "@/lib/format";
import type { Idea } from "./schemas";

export function KindBadge({ kind, className = "" }: { kind: Idea["kind"]; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${IDEA_KINDS[kind].chip} ${className}`}>
      {IDEA_KINDS[kind].label}
    </span>
  );
}

/** Square tile: cover, title and interested count over a bottom scrim (the "Trending Picks" tiles). */
export function IdeaTile({ idea }: { idea: Idea }) {
  return (
    <Link href={`/idea/?id=${idea.id}`} className="relative block aspect-square overflow-hidden rounded-card shadow-soft">
      <Cover topic={idea.topic} src={idea.cover_url} className="absolute inset-0 size-full" />
      <div className="absolute inset-0 bg-linear-to-t from-navy-900/75 via-navy-900/10 to-transparent" />
      <KindBadge kind={idea.kind} className="absolute top-2 left-2 bg-white/90" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white">
        <h3 className="line-clamp-2 text-sm leading-tight font-bold">{idea.title}</h3>
        <span className="flex shrink-0 items-center gap-1 text-xs font-bold">
          <Users aria-hidden className="size-4" />
          {idea.interested_count}
          <span className="sr-only">interested</span>
        </span>
      </div>
    </Link>
  );
}

/** List row: thumbnail, title, snippet, author (the "Saved" list rows in the mockups). */
export function IdeaRow({ idea }: { idea: Idea }) {
  const topic = topicStyle(idea.topic);
  return (
    <Link
      href={`/idea/?id=${idea.id}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-2 pr-3 shadow-soft transition-colors hover:bg-muted"
    >
      <Cover topic={idea.topic} src={idea.cover_url} className="size-20 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <KindBadge kind={idea.kind} />
          <span className="truncate text-xs text-foreground/60">{topic.label}</span>
        </div>
        <h3 className="mt-1 line-clamp-1 font-bold">{idea.title}</h3>
        {idea.body && <p className="line-clamp-1 text-sm text-foreground/70">{idea.body}</p>}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground/60">
          <Avatar name={idea.author_name} src={idea.author_avatar} size={18} />
          <span className="truncate">{idea.author_name ?? "Zubli member"}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{timeAgo(idea.created_at)}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{idea.interested_count} interested</span>
        </p>
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-foreground/40" />
    </Link>
  );
}
