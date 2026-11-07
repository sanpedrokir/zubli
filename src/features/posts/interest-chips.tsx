"use client";

import Link from "next/link";
import { useInterests } from "./api";

/** Top-level interests as links. `hrefFor(null)` is the "All" chip. Selected chip uses the mode accent. */
export function InterestChips({
  selectedId,
  hrefFor,
  accent,
}: {
  selectedId: string | null;
  hrefFor: (interestId: string | null) => string;
  accent: "bg-turquoise-500" | "bg-yellow-500";
}) {
  const { data } = useInterests();
  const top = (data ?? []).filter((i) => !i.parent_id);
  const chip = (selected: boolean) =>
    `inline-flex min-h-11 items-center rounded-full px-4 font-bold ${
      selected ? `${accent} text-navy-900` : "border border-border hover:bg-surface"
    }`;
  return (
    <nav aria-label="Filter by interest" className="mt-4 flex flex-wrap gap-2">
      <Link href={hrefFor(null)} aria-current={selectedId === null ? "true" : undefined} className={chip(selectedId === null)}>
        All
      </Link>
      {top.map((i) => (
        <Link key={i.id} href={hrefFor(i.id)} aria-current={selectedId === i.id ? "true" : undefined} className={chip(selectedId === i.id)}>
          {i.name}
        </Link>
      ))}
    </nav>
  );
}
