"use client";

import { SignedInGate } from "@/features/auth/signed-in-gate";
import { env } from "@/lib/env";
import { useFeed } from "./api";
import { FeedList } from "./feed-list";

function Latest() {
  const feed = useFeed({ mode: "latest", interestId: null, placeId: null });
  return <FeedList query={feed} />;
}

/** Home "Latest" feed; renders nothing until Clerk + Neon are configured so signed-out dev still works. */
export function LatestFeed() {
  if (!env.clerkPublishableKey || !env.neonDataApiUrl) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-extrabold">Latest</h2>
      <SignedInGate>
        <Latest />
      </SignedInGate>
    </section>
  );
}
