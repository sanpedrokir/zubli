"use client";

import type { UseInfiniteQueryResult } from "@tanstack/react-query";
import { PostCard } from "./post-card";
import type { PostView } from "./schemas";

/** Renders a keyset-paginated feed with a "Load more" button (no scroll-jacking, keyboard friendly). */
export function FeedList({
  query,
  empty = "Nothing here yet. Be the first to share a find!",
}: {
  query: UseInfiniteQueryResult<PostView[], Error>;
  empty?: string;
}) {
  const { data, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  if (isPending) return <p className="mt-6 text-foreground/70">Loading…</p>;
  if (isError) return <p role="alert" className="mt-6">Couldn&apos;t load posts. Please try again.</p>;
  if (data.length === 0) return <p className="mt-6 text-foreground/70">{empty}</p>;
  return (
    <div className="mt-6">
      <ul className="flex flex-col gap-3">
        {data.map((p) => (
          <li key={p.id}>
            <PostCard post={p} />
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <button
          type="button"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="mt-4 min-h-11 rounded-full border border-border px-6 font-bold hover:bg-surface disabled:opacity-60"
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
