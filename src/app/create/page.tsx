import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/placeholder-page";

export const metadata: Metadata = { title: "Share a find" };

export default function Page() {
  return <PlaceholderPage title="Share a find" blurb="Posting arrives in Milestone 3. A location will always be optional." accent="coral" />;
}
