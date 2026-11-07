"use client";

import { useMemo, useState } from "react";
import { DataGate, SignInPrompt } from "@/features/auth/signed-in-gate";
import { useFeed, useInterests } from "@/features/posts/api";
import { interestStyle } from "@/features/posts/interest-style";
import { PostCard } from "@/features/posts/post-card";
import { HeroCard, TileCard } from "@/features/posts/post-tiles";
import { useSession } from "@/lib/neon/use-neon";

type Filter = { kind: "forYou" } | { kind: "following" } | { kind: "interest"; id: string };

const chipBase = "inline-flex min-h-11 shrink-0 items-center rounded-full px-4 font-bold";

function Feed() {
  const interests = useInterests();
  const { isSignedIn } = useSession();
  const [filter, setFilter] = useState<Filter>({ kind: "forYou" });
  const needsSignIn = filter.kind === "following" && !isSignedIn;
  const feed = useFeed({
    mode: filter.kind === "following" ? "following" : filter.kind === "interest" ? "interest" : "latest",
    interestId: filter.kind === "interest" ? filter.id : null,
    enabled: !needsSignIn,
  });

  const posts = useMemo(() => feed.data ?? [], [feed.data]);
  const hero = posts[0];
  // "Trending" = the most-liked of what's loaded (a real trending RPC can replace this later).
  const trending = useMemo(
    () => [...posts.slice(1)].sort((a, b) => b.likes_count - a.likes_count).slice(0, 4),
    [posts],
  );
  const rest = useMemo(() => posts.slice(1).filter((p) => !trending.includes(p)), [posts, trending]);

  const top = (interests.data ?? []).filter((i) => !i.parent_id);
  const isActive = (f: Filter) => JSON.stringify(f) === JSON.stringify(filter);
  const chip = (f: Filter, pastel: string) =>
    `${chipBase} ${isActive(f) ? "bg-pink-500 text-white shadow-soft" : `${pastel} text-navy-900 dark:text-foreground`}`;

  return (
    <>
      <div role="group" aria-label="Filter feed" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <button type="button" aria-pressed={isActive({ kind: "forYou" })} onClick={() => setFilter({ kind: "forYou" })} className={chip({ kind: "forYou" }, "bg-pink-500/15")}>
          For You
        </button>
        <button type="button" aria-pressed={isActive({ kind: "following" })} onClick={() => setFilter({ kind: "following" })} className={chip({ kind: "following" }, "bg-violet-500/20")}>
          Following
        </button>
        {top.map((i) => {
          const f: Filter = { kind: "interest", id: i.id };
          return (
            <button key={i.id} type="button" aria-pressed={isActive(f)} onClick={() => setFilter(f)} className={chip(f, interestStyle(i.slug).chip)}>
              {i.name}
            </button>
          );
        })}
      </div>

      {needsSignIn && <SignInPrompt message="Sign in to see posts from people you follow." />}
      {!needsSignIn && feed.isPending && <p className="mt-6 text-foreground/70">Loading…</p>}
      {!needsSignIn && feed.isError && <p role="alert" className="mt-6">Couldn&apos;t load posts. Please try again.</p>}
      {!needsSignIn && feed.isSuccess && posts.length === 0 && (
        <p className="mt-6 text-foreground/70">
          {filter.kind === "following"
            ? "Follow people from their posts to see their finds here."
            : "Nothing here yet. Be the first to share a find!"}
        </p>
      )}

      {hero && (
        <div className="mt-4">
          <HeroCard post={hero} />
        </div>
      )}

      {trending.length > 0 && (
        <section className="mt-6" aria-labelledby="trending-heading">
          <h2 id="trending-heading" className="font-display text-xl font-extrabold">Trending Picks</h2>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {trending.map((p) => (
              <li key={p.id}>
                <TileCard post={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <section className="mt-6" aria-labelledby="latest-heading">
          <h2 id="latest-heading" className="font-display text-xl font-extrabold">Latest</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {rest.map((p) => (
              <li key={p.id}>
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {feed.hasNextPage && (
        <button
          type="button"
          onClick={() => feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
          className="mt-4 min-h-11 rounded-full border border-border px-6 font-bold hover:bg-surface disabled:opacity-60"
        >
          {feed.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </>
  );
}

export function Discover() {
  return (
    <section>
      <h1 className="font-display text-4xl font-extrabold">Discover</h1>
      <p className="mt-1 text-foreground/70">Found something good? See what people love.</p>
      <DataGate>
        <Feed />
      </DataGate>
    </section>
  );
}
