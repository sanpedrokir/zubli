"use client";

import { ClerkProvider } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { env } from "@/lib/env";
import { AnonymousNeonProvider, ClerkNeonProvider } from "@/lib/neon/neon-provider";
import { ProfileSync } from "./profile-sync";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );
  // Public browsing needs only the Data API; Clerk adds sign-in on top when its key is configured.
  const content = env.clerkPublishableKey ? (
    <ClerkProvider publishableKey={env.clerkPublishableKey}>
      <ClerkNeonProvider>
        {env.neonDataApiUrl ? <ProfileSync /> : null}
        {children}
      </ClerkNeonProvider>
    </ClerkProvider>
  ) : (
    <AnonymousNeonProvider>{children}</AnonymousNeonProvider>
  );
  return <QueryClientProvider client={queryClient}>{content}</QueryClientProvider>;
}
