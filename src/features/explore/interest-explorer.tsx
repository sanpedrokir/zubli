"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { z } from "zod";
import { DataGate } from "@/features/auth/signed-in-gate";
import { useFeed, usePlaces } from "@/features/posts/api";
import { FeedList } from "@/features/posts/feed-list";
import { InterestChips } from "@/features/posts/interest-chips";

const uuid = (v: string | null) => (v && z.uuid().safeParse(v).success ? v : null);
const href = (interest: string | null, place: string | null) => {
  const q = new URLSearchParams();
  if (interest) q.set("interest", interest);
  if (place) q.set("place", place);
  const s = q.toString();
  return `/explore/interest/${s ? `?${s}` : ""}`;
};

function Results({ interestId, placeId }: { interestId: string | null; placeId: string | null }) {
  const router = useRouter();
  const places = usePlaces();
  // Interest is the primary axis; with none chosen we show everything (the latest feed).
  const feed = useFeed({ mode: interestId ? "interest" : "latest", interestId, placeId });
  const choices = useMemo(() => (places.data ?? []).filter((p) => p.kind !== "venue").sort((a, b) => a.name.localeCompare(b.name)), [places.data]);
  return (
    <>
      <InterestChips selectedId={interestId} hrefFor={(i) => href(i, placeId)} accent="bg-yellow-500" />
      {/* Location is an optional narrowing filter, never required. */}
      <form className="mt-4 flex flex-wrap items-center gap-2" onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="place-filter" className="font-bold">Where?</label>
        <select
          id="place-filter"
          value={placeId ?? ""}
          onChange={(e) => router.push(href(interestId, e.target.value || null))}
          className="min-h-11 rounded-card border border-border bg-background px-4"
        >
          <option value="">Anywhere</option>
          {choices.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {placeId && (
          <Link href={href(interestId, null)} className="font-bold text-violet-600 underline">
            Clear
          </Link>
        )}
      </form>
      <FeedList query={feed} empty="No recommendations match yet." />
    </>
  );
}

export function InterestExplorer() {
  const params = useSearchParams();
  return (
    <DataGate>
      <Results interestId={uuid(params.get("interest"))} placeId={uuid(params.get("place"))} />
    </DataGate>
  );
}
