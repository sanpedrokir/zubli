import type { Metadata } from "next";
import { Suspense } from "react";
import { PostDetail } from "@/features/posts/post-detail";

export const metadata: Metadata = { title: "Post" };

// Static export: posts are addressed by query param (/post/?id=…), not an [id] segment.
export default function Page() {
  return (
    <Suspense fallback={<p className="text-foreground/70">Loading…</p>}>
      <PostDetail />
    </Suspense>
  );
}
