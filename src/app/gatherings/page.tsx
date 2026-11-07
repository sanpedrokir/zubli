import type { Metadata } from "next";
import { GatheringsView } from "@/features/gatherings/gatherings-view";

export const metadata: Metadata = { title: "Gatherings" };

export default function Page() {
  return <GatheringsView />;
}
