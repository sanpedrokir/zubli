import type { Metadata } from "next";
import { AccountPanel } from "@/features/auth/account-panel";
import { PlaceholderPage } from "@/components/ui/placeholder-page";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return (
    <PlaceholderPage title="Profile" blurb="Your Zubli account." accent="violet">
      <AccountPanel />
    </PlaceholderPage>
  );
}
