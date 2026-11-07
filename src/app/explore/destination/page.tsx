import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/placeholder-page";

export const metadata: Metadata = { title: "Explore by Destination" };

export default function Page() {
  return <PlaceholderPage title="Explore by Destination" blurb="Find recommendations for a place. Coming in Milestone 4." accent="turquoise" />;
}
