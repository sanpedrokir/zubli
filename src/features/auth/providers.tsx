"use client";

import { ClerkProvider } from "@clerk/react";
import type { ReactNode } from "react";
import { env } from "@/lib/env";
import { ProfileSync } from "./profile-sync";

export function Providers({ children }: { children: ReactNode }) {
  if (!env.clerkPublishableKey) {
    // Keep the app usable (signed-out) until Clerk keys are configured.
    return <>{children}</>;
  }
  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey}>
      {env.neonDataApiUrl ? <ProfileSync /> : null}
      {children}
    </ClerkProvider>
  );
}
