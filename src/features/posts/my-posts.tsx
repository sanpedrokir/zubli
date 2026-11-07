"use client";

import { env } from "@/lib/env";
import { useMyPosts } from "./api";
import { FeedList } from "./feed-list";

function List() {
  return <FeedList query={useMyPosts()} empty="You haven't shared anything yet." />;
}

/** Must render inside a signed-in Clerk session. */
export function MyPosts() {
  if (!env.neonDataApiUrl) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-extrabold">Your posts</h2>
      <List />
    </section>
  );
}
