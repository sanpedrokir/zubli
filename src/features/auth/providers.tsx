"use client";

import { ClerkProvider } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { env } from "@/lib/env";
import { ProfileSync } from "./profile-sync";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );
  if (!env.clerkPublishableKey) {
    // Keep the app usable (signed-out) until Clerk keys are configured.
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey}>
      <QueryClientProvider client={queryClient}>
        {env.neonDataApiUrl ? <ProfileSync /> : null}
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  );
}
