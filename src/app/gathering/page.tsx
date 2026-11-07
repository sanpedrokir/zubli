import type { Metadata } from "next";
import { Suspense } from "react";
import { GatheringDetail } from "@/features/gatherings/gathering-detail";

export const metadata: Metadata = { title: "Gathering" };

// Static export: addressed by query param (/gathering/?id=…), not a dynamic [id] segment.
export default function Page() {
  return (
    <Suspense fallback={<p className="text-foreground/70">Loading…</p>}>
      <GatheringDetail />
    </Suspense>
  );
}
