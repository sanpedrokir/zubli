"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { useFeed, usePlaces } from "@/features/posts/api";
import { FeedList } from "@/features/posts/feed-list";
import { InterestChips } from "@/features/posts/interest-chips";

const uuid = (v: string | null) => (v && z.uuid().safeParse(v).success ? v : null);
const href = (place: string | null, interest: string | null) => {
  const q = new URLSearchParams();
  if (place) q.set("place", place);
  if (interest) q.set("interest", interest);
  const s = q.toString();
  return `/explore/destination/${s ? `?${s}` : ""}`;
};

function PlaceTiles() {
  const { data, isPending, isError } = usePlaces();
  if (isPending) return <p className="mt-6 text-foreground/70">Loading…</p>;
  if (isError) return <p role="alert" className="mt-6">Couldn&apos;t load destinations.</p>;
  const places = [...data].filter((p) => p.kind !== "venue").sort((a, b) => b.posts_count - a.posts_count || a.name.localeCompare(b.name));
  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {places.map((p) => (
        <li key={p.id}>
          <Link
            href={href(p.id, null)}
            className="flex min-h-11 flex-col rounded-card bg-turquoise-500 p-4 text-navy-900 shadow-soft hover:-translate-y-0.5"
          >
            <span className="font-display font-extrabold">{p.name}</span>
            <span className="text-sm capitalize">{p.kind}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Results({ placeId, interestId }: { placeId: string; interestId: string | null }) {
  const places = usePlaces();
  const feed = useFeed({ mode: "destination", placeId, interestId });
  const place = places.data?.find((p) => p.id === placeId);
  return (
    <>
      <p className="mt-4">
        <Link href={href(null, null)} className="font-bold text-violet-600 underline">
          ← All destinations
        </Link>
      </p>
      <h2 className="mt-2 font-display text-2xl font-extrabold">{place?.name ?? "Destination"}</h2>
      <InterestChips selectedId={interestId} hrefFor={(i) => href(placeId, i)} accent="bg-turquoise-500" />
      <FeedList query={feed} empty="No recommendations here yet." />
    </>
  );
}

export function DestinationExplorer() {
  const params = useSearchParams();
  const placeId = uuid(params.get("place"));
  const interestId = uuid(params.get("interest"));
  return <SignedInGate>{placeId ? <Results placeId={placeId} interestId={interestId} /> : <PlaceTiles />}</SignedInGate>;
}
