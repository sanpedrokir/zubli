import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/placeholder-page";

export const metadata: Metadata = { title: "Explore by Interest" };

export default function Page() {
  return <PlaceholderPage title="Explore by Interest" blurb="Find recommendations by passion, anywhere. Coming in Milestone 4." accent="yellow" />;
}
