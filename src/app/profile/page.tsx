import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/ui/placeholder-page";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return <PlaceholderPage title="Profile" blurb="Sign-in and profiles arrive in Milestone 1." accent="violet" />;
}
