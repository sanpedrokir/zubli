import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/placeholder-page";

export const metadata: Metadata = { title: "Saved" };

export default function Page() {
  return <PlaceholderPage title="Saved" blurb="Your saved recommendations. Coming in Milestone 5." accent="violet" />;
}
