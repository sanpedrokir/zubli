"use client";

import { env } from "@/lib/env";
import { useMyPosts } from "./api";
import { PostCard } from "./post-card";

function List() {
  const { data, isPending, isError } = useMyPosts();
  if (isPending) return <p className="text-foreground/70">Loading your posts…</p>;
  if (isError) return <p role="alert">Couldn&apos;t load your posts.</p>;
  if (data.length === 0) return <p className="text-foreground/70">You haven&apos;t shared anything yet.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {data.map((p) => (
        <li key={p.id}>
          <PostCard post={p} />
        </li>
      ))}
    </ul>
  );
}

/** Must render inside a signed-in Clerk session. */
export function MyPosts() {
  if (!env.neonDataApiUrl) return null;
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-xl font-extrabold">Your posts</h2>
      <List />
    </section>
  );
}
