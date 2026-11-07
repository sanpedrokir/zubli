"use client";

import Link from "next/link";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { useInterests, usePlaces } from "@/features/posts/api";
import { interestStyle } from "@/features/posts/interest-style";

const GRADIENTS = [
  "from-violet-500 to-pink-500",
  "from-turquoise-500 to-sky-500",
  "from-orange-500 to-yellow-500",
  "from-pink-500 to-coral-500",
];

function Destinations() {
  const { data, isPending, isError } = usePlaces();
  if (isPending) return <p className="mt-3 text-foreground/70">Loading…</p>;
  if (isError) return <p role="alert" className="mt-3">Couldn&apos;t load destinations.</p>;
  const places = data
    .filter((p) => p.kind !== "venue")
    .sort((a, b) => b.posts_count - a.posts_count || a.name.localeCompare(b.name))
    .slice(0, 12);
  return (
    <ul className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
      {places.map((p, i) => (
        <li key={p.id} className="shrink-0">
          <Link
            href={`/explore/destination/?place=${p.id}`}
            className={`relative flex size-28 items-end overflow-hidden rounded-card bg-linear-to-br p-3 text-white shadow-soft ${GRADIENTS[i % GRADIENTS.length]}`}
          >
            <span className="font-display font-extrabold leading-tight">{p.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function InterestGrid() {
  const { data, isPending, isError } = useInterests();
  if (isPending) return <p className="mt-3 text-foreground/70">Loading…</p>;
  if (isError) return <p role="alert" className="mt-3">Couldn&apos;t load interests.</p>;
  const top = data.filter((i) => !i.parent_id);
  return (
    <ul className="mt-3 grid grid-cols-4 gap-3">
      {top.map((i) => {
        const { Icon, tile } = interestStyle(i.slug);
        return (
          <li key={i.id}>
            <Link
              href={`/explore/interest/?interest=${i.id}`}
              className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-card p-1 text-center text-xs font-bold leading-tight shadow-soft ${tile}`}
            >
              <Icon aria-hidden className="size-6" />
              <span>{i.name}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ExploreHub() {
  return (
    <section>
      <h1 className="font-display text-4xl font-extrabold">Explore</h1>
      {/* Two discovery modes. Location is never required: Interests works without picking a place. */}
      <nav aria-label="Discovery mode" className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/explore/destination/"
          className="flex min-h-11 items-center justify-center rounded-full bg-turquoise-500 px-4 font-bold text-navy-900 shadow-soft"
        >
          Places
        </Link>
        <Link
          href="/explore/interest/"
          className="flex min-h-11 items-center justify-center rounded-full bg-yellow-500 px-4 font-bold text-navy-900 shadow-soft"
        >
          Interests
        </Link>
      </nav>
      <SignedInGate>
        <h2 className="mt-6 font-display text-xl font-extrabold">Top Destinations</h2>
        <Destinations />
        <h2 className="mt-6 font-display text-xl font-extrabold">Explore by Interest</h2>
        <InterestGrid />
      </SignedInGate>
    </section>
  );
}
