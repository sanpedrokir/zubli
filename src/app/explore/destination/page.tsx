import type { Metadata } from "next";
import { Suspense } from "react";
import { DestinationExplorer } from "@/features/explore/destination-explorer";

export const metadata: Metadata = { title: "Explore by Destination" };

export default function Page() {
  return (
    <section>
      <div className="mb-4 h-1.5 w-16 rounded-full bg-turquoise-500" />
      <h1 className="font-display text-3xl font-extrabold">Explore by Destination</h1>
      <p className="mt-2 text-foreground/70">Find recommendations for a place, from a country down to a spot.</p>
      <Suspense fallback={<p className="mt-6 text-foreground/70">Loading…</p>}>
        <DestinationExplorer />
      </Suspense>
    </section>
  );
}
