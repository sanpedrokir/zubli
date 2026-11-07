import type { Metadata } from "next";
import { Suspense } from "react";
import { ChatThread } from "@/features/chat/chat-thread";

export const metadata: Metadata = { title: "Chat" };

// Static export: addressed by query param (/chat/?id=…), not a dynamic [id] segment.
export default function Page() {
  return (
    <Suspense fallback={<p className="text-foreground/70">Loading…</p>}>
      <ChatThread />
    </Suspense>
  );
}
