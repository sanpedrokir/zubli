"use client";

import { ArrowRight, ChevronRight, Globe, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Cover } from "@/components/ui/cover";
import { dateBadge, formatWhen } from "@/lib/format";
import type { Gathering } from "./schemas";

export function placeLabel(g: Pick<Gathering, "is_online" | "location_text">): string {
  if (g.is_online) return g.location_text ? `Online · ${g.location_text}` : "Online";
  return g.location_text ?? "Place to be agreed in the chat";
}

export function spotsLabel(g: Pick<Gathering, "capacity" | "attendees_count">): string {
  if (g.capacity === null) return `${g.attendees_count} going`;
  const left = Math.max(g.capacity - g.attendees_count, 0);
  return left === 0 ? `Full · ${g.attendees_count} going` : `${g.attendees_count} going · ${left} spot${left === 1 ? "" : "s"} left`;
}

function DateBadge({ iso, className = "" }: { iso: string; className?: string }) {
  const { month, day } = dateBadge(iso);
  return (
    <span className={`flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white leading-none text-navy-900 shadow-soft ${className}`}>
      <span className="text-[10px] font-bold text-pink-500">{month}</span>
      <span className="font-display text-lg font-extrabold">{day}</span>
    </span>
  );
}

/** Big featured card: cover, title over the image and a round arrow button (the "Tokyo" hero in the mockups). */
export function GatheringHero({ gathering: g }: { gathering: Gathering }) {
  return (
    <Link href={`/gathering/?id=${g.id}`} className="group relative block aspect-[16/10] overflow-hidden rounded-sheet shadow-soft">
      <Cover topic={g.topic} src={g.cover_url} className="absolute inset-0 size-full" />
      <div className="absolute inset-0 bg-linear-to-t from-navy-900/75 via-navy-900/10 to-transparent" />
      <DateBadge iso={g.starts_at} className="absolute top-3 left-3" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight font-extrabold sm:text-3xl">{g.title}</h2>
          <p className="mt-0.5 truncate text-sm font-medium text-white/90">
            {formatWhen(g.starts_at)} · {spotsLabel(g)}
          </p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-navy-900 transition-transform group-hover:translate-x-0.5">
          <ArrowRight aria-hidden className="size-5" />
          <span className="sr-only">Open gathering</span>
        </span>
      </div>
    </Link>
  );
}

/** List row with thumbnail, when, where and spots. */
export function GatheringRow({ gathering: g }: { gathering: Gathering }) {
  const PlaceIcon = g.is_online ? Globe : MapPin;
  return (
    <Link
      href={`/gathering/?id=${g.id}`}
      className="flex items-center gap-3 rounded-card border border-border bg-surface p-2 pr-3 shadow-soft transition-colors hover:bg-muted"
    >
      <div className="relative shrink-0">
        <Cover topic={g.topic} src={g.cover_url} className="size-20 rounded-xl" />
        <DateBadge iso={g.starts_at} className="absolute -right-2 -bottom-2 size-10 [&>span:last-child]:text-base" />
      </div>
      <div className="min-w-0 flex-1 pl-1">
        <h3 className="line-clamp-1 font-bold">
          {g.cancelled && <span className="mr-1.5 rounded-full bg-coral-500/15 px-2 py-0.5 text-xs text-coral-500">Cancelled</span>}
          {g.title}
        </h3>
        <p className="text-sm text-foreground/70">{formatWhen(g.starts_at)}</p>
        <p className="flex items-center gap-1 truncate text-xs text-foreground/60">
          <PlaceIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{placeLabel(g)}</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-violet-600">
          <Users aria-hidden className="size-3.5" />
          {spotsLabel(g)}
          {g.joined_by_me && <span className="ml-1 rounded-full bg-turquoise-500/20 px-2 py-0.5 text-navy-900">You&apos;re going</span>}
        </p>
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-foreground/40" />
    </Link>
  );
}
