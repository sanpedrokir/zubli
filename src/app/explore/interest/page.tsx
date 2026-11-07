import type { Metadata } from "next";
import { Suspense } from "react";
import { InterestExplorer } from "@/features/explore/interest-explorer";

export const metadata: Metadata = { title: "Explore by Interest" };

export default function Page() {
  return (
    <section>
      <div className="mb-4 h-1.5 w-16 rounded-full bg-yellow-500" />
      <h1 className="font-display text-3xl font-extrabold">Explore by Interest</h1>
      <p className="mt-2 text-foreground/70">Follow your passions, anywhere. Location is optional.</p>
      <Suspense fallback={<p className="mt-6 text-foreground/70">Loading…</p>}>
        <InterestExplorer />
      </Suspense>
    </section>
  );
}
