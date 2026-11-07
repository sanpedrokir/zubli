import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateFlow } from "@/features/create/create-flow";

export const metadata: Metadata = { title: "Create" };

// Static export: addressed by query param (/create/?type=…), not a dynamic [id] segment.
export default function Page() {
  return (
    <Suspense fallback={<p className="text-foreground/70">Loading…</p>}>
      <CreateFlow />
    </Suspense>
  );
}
