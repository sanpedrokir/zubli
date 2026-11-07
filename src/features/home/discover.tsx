"use client";

import { Bell, Briefcase, Sparkles, Sun } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ui } from "@/components/ui/styles";
import { DataGate } from "@/features/auth/signed-in-gate";
import { useUnreadCount } from "@/features/chat/api";
import { GatheringHero, GatheringRow } from "@/features/gatherings/gathering-cards";
import { useGatherings } from "@/features/gatherings/api";
import { useIdeas } from "@/features/ideas/api";
import { IdeaRow, IdeaTile } from "@/features/ideas/idea-cards";

type KindFilter = "all" | "activity" | "career";

const FILTERS: { value: KindFilter; label: string; Icon: typeof Sun; pastel: string }[] = [
  { value: "all", label: "For You", Icon: Sparkles, pastel: "bg-pink-500/10" },
  { value: "activity", label: "Activities", Icon: Sun, pastel: "bg-turquoise-500/20" },
  { value: "career", label: "Careers", Icon: Briefcase, pastel: "bg-yellow-500/30" },
];

function ChatsBell() {
  const unread = useUnreadCount();
  const count = unread.data ?? 0;
  return (
    <Link href="/chats/" className={`${ui.iconButton} relative`} aria-label={count ? `Chats, ${count} unread` : "Chats"}>
      <Bell aria-hidden className="size-5" />
      {count > 0 && (
        <span aria-hidden className="absolute -top-0.5 -right-0.5 flex min-w-5 items-center justify-center rounded-full bg-pink-500 px-1 text-[11px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function Feed() {
  const [kind, setKind] = useState<KindFilter>("all");
  const ideas = useIdeas({ kind: kind === "all" ? null : kind });
  const gatherings = useGatherings({ when: "upcoming", limit: 4 });

  const list = useMemo(() => ideas.data ?? [], [ideas.data]);
  // "Trending" = the ideas the most people are interested in, from what's loaded.
  const trending = useMemo(
    () => [...list].filter((i) => i.interested_count > 0).sort((a, b) => b.interested_count - a.interested_count).slice(0, 4),
    [list],
  );
  const [next, ...soon] = gatherings.data ?? [];

  return (
    <>
      <div role="group" aria-label="Filter ideas" className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map(({ value, label, Icon, pastel }) => (
          <button
            key={value}
            type="button"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
            className={`${ui.chip} ${kind === value ? ui.chipActive : `${pastel} text-foreground`}`}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </button>
        ))}
      </div>

      {next ? (
        <div className="mt-4">
          <GatheringHero gathering={next} />
        </div>
      ) : (
        gatherings.isSuccess && (
          <div className={`${ui.card} mt-4 bg-linear-to-br from-violet-500 to-pink-500 p-5 text-white`}>
            <h2 className="font-display text-2xl font-extrabold">Start something small</h2>
            <p className="mt-1 text-white/90">A walk, a coffee, a skills swap — pick a time and let people join.</p>
            <Link href="/create/?type=gathering" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-white px-6 font-bold text-pink-500">
              Organise a gathering
            </Link>
          </div>
        )
      )}

      {trending.length > 0 && (
        <section className="mt-6" aria-labelledby="trending-heading">
          <h2 id="trending-heading" className={ui.sectionTitle}>
            Trending ideas
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {trending.map((i) => (
              <li key={i.id}>
                <IdeaTile idea={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {soon.length > 0 && (
        <section className="mt-6" aria-labelledby="soon-heading">
          <div className="flex items-center justify-between">
            <h2 id="soon-heading" className={ui.sectionTitle}>
              Happening soon
            </h2>
            <Link href="/gatherings/" className={ui.seeAll}>
              See all
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {soon.map((g) => (
              <li key={g.id}>
                <GatheringRow gathering={g} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6" aria-labelledby="latest-heading">
        <h2 id="latest-heading" className={ui.sectionTitle}>
          Latest ideas
        </h2>
        {ideas.isPending && <p className="mt-3 text-foreground/70">Loading…</p>}
        {ideas.isError && (
          <p role="alert" className="mt-3">
            Couldn&apos;t load ideas. Please try again.
          </p>
        )}
        {ideas.isSuccess && list.length === 0 && (
          <div className={`${ui.card} mt-3 p-5`}>
            <p className="font-bold">No ideas here yet.</p>
            <p className="mt-1 text-foreground/70">Thinking about a new hobby, a second career or a way to give back? Share it.</p>
            <Link href="/create/" className={`${ui.primaryButton} mt-4`}>
              Share an idea
            </Link>
          </div>
        )}
        <ul className="mt-3 flex flex-col gap-3">
          {list.map((i) => (
            <li key={i.id}>
              <IdeaRow idea={i} />
            </li>
          ))}
        </ul>
        {ideas.hasNextPage && (
          <button type="button" onClick={() => ideas.fetchNextPage()} disabled={ideas.isFetchingNextPage} className={`${ui.outlineButton} mt-4`}>
            {ideas.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        )}
      </section>
    </>
  );
}

export function Discover() {
  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className={ui.pageTitle}>Discover</h1>
          <p className="mt-1 text-foreground/70">New things to do, learn and try, at any age.</p>
        </div>
        <DataGate fallback={null}>
          <ChatsBell />
        </DataGate>
      </div>
      <DataGate>
        <Feed />
      </DataGate>
    </section>
  );
}
