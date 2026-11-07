import type { Metadata } from "next";
import { Suspense } from "react";
import { IdeaDetail } from "@/features/ideas/idea-detail";

export const metadata: Metadata = { title: "Idea" };

// Static export: addressed by query param (/idea/?id=…), not a dynamic [id] segment.
export default function Page() {
  return (
    <Suspense fallback={<p className="text-foreground/70">Loading…</p>}>
      <IdeaDetail />
    </Suspense>
  );
}
