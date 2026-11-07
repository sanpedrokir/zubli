"use client";

import { useAuth, useUser } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { NeonPostgrestClient } from "@neon/postgrest-js";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { env } from "@/lib/env";

/**
 * One Neon Data API client for the whole app.
 *  - Signed out: requests carry no token and run as the database's `anonymous` role (read-only public content).
 *  - Signed in: every request carries the user's Clerk JWT (`neon` template) and runs as `authenticated`.
 * Never put DATABASE_URL here; this talks only to the Data API.
 */
interface Session {
  client: NeonPostgrestClient;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  /** Shown name and avatar from the sign-in provider, used to create the profile row. */
  displayName: string | null;
  avatarUrl: string | null;
}

const NeonContext = createContext<Session | null>(null);

function makeClient(getToken: () => Promise<string | null>) {
  return new NeonPostgrestClient({
    dataApiUrl: env.neonDataApiUrl,
    options: {
      global: {
        fetch: async (input, init) => {
          const headers = new Headers(init?.headers);
          const token = await getToken();
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(input, { ...init, headers });
        },
      },
    },
  });
}

/** Cached data (liked/saved flags, Following feed) belongs to one identity: drop it when that changes. */
function useResetCacheOnIdentityChange(userId: string | null) {
  const queryClient = useQueryClient();
  const previous = useRef<string | null>(userId);
  useEffect(() => {
    if (previous.current !== userId) {
      previous.current = userId;
      queryClient.clear();
    }
  }, [userId, queryClient]);
}

export function AnonymousNeonProvider({ children }: { children: ReactNode }) {
  const value = useMemo<Session>(
    () => ({ client: makeClient(async () => null), isLoaded: true, isSignedIn: false, userId: null, displayName: null, avatarUrl: null }),
    [],
  );
  return <NeonContext.Provider value={value}>{children}</NeonContext.Provider>;
}

/** Must render inside <ClerkProvider>. */
export function ClerkNeonProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = user?.fullName ?? email?.split("@")[0] ?? null;
  const avatarUrl = user?.hasImage ? user.imageUrl : null;
  const signedIn = !!isSignedIn;
  const id = signedIn ? (userId ?? null) : null;
  useResetCacheOnIdentityChange(id);

  const value = useMemo<Session>(
    () => ({
      client: makeClient(async () => {
        if (!signedIn) return null;
        try {
          return await getToken({ template: env.clerkNeonTemplate });
        } catch (error) {
          // E.g. the `neon` JWT template isn't created yet: keep public browsing working.
          console.warn("Couldn't get a Neon token; continuing as a visitor.", error);
          return null;
        }
      }),
      isLoaded: !!isLoaded,
      isSignedIn: signedIn,
      userId: id,
      displayName: signedIn ? displayName : null,
      avatarUrl: signedIn ? avatarUrl : null,
    }),
    [signedIn, isLoaded, id, getToken, displayName, avatarUrl],
  );
  return <NeonContext.Provider value={value}>{children}</NeonContext.Provider>;
}

function useSessionContext(): Session {
  const value = useContext(NeonContext);
  if (!value) throw new Error("useNeon/useSession must be used inside <Providers>.");
  return value;
}

export const useNeon = () => useSessionContext().client;

/** Who is looking: works with or without Clerk configured. */
export function useSession() {
  const { isLoaded, isSignedIn, userId, displayName, avatarUrl } = useSessionContext();
  return { isLoaded, isSignedIn, userId, displayName, avatarUrl };
}
