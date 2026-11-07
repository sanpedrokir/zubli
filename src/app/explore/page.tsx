import type { Metadata } from "next";
import { ExploreHub } from "@/features/explore/explore-hub";

export const metadata: Metadata = { title: "Explore" };

export default function Page() {
  return <ExploreHub />;
}
