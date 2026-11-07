"use client";

import { useState } from "react";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { env } from "@/lib/env";
import { useFeed } from "./api";
import { FeedList } from "./feed-list";

type Tab = "latest" | "following";

function Feed({ tab }: { tab: Tab }) {
  const feed = useFeed({ mode: tab });
  return (
    <FeedList
      query={feed}
      empty={tab === "following" ? "Follow people from their posts to see their finds here." : undefined}
    />
  );
}

/** Home feed: Latest from everyone, or Following. Renders nothing until Clerk + Neon are configured. */
export function LatestFeed() {
  const [tab, setTab] = useState<Tab>("latest");
  if (!env.clerkPublishableKey || !env.neonDataApiUrl) return null;
  const tabClass = (t: Tab) =>
    `min-h-11 rounded-full px-5 font-bold ${tab === t ? "bg-violet-600 text-white" : "border border-border hover:bg-surface"}`;
  return (
    <section className="mt-10">
      <div role="group" aria-label="Feed" className="flex gap-2">
        <button type="button" aria-pressed={tab === "latest"} onClick={() => setTab("latest")} className={tabClass("latest")}>
          Latest
        </button>
        <button type="button" aria-pressed={tab === "following"} onClick={() => setTab("following")} className={tabClass("following")}>
          Following
        </button>
      </div>
      <SignedInGate>
        <Feed tab={tab} />
      </SignedInGate>
    </section>
  );
}
