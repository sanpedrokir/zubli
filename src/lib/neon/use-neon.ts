"use client";

import { useAuth } from "@clerk/react";
import { fetchWithToken, NeonPostgrestClient } from "@neon/postgrest-js";
import { useMemo } from "react";
import { env } from "@/lib/env";

/** Neon Data API client that authenticates every request with the user's Clerk JWT. */
export function useNeon() {
  const { getToken } = useAuth();
  return useMemo(
    () =>
      new NeonPostgrestClient({
        dataApiUrl: env.neonDataApiUrl,
        options: {
          global: {
            fetch: fetchWithToken(async () => {
              const token = await getToken({ template: env.clerkNeonTemplate });
              if (!token) throw new Error("Not signed in");
              return token;
            }),
          },
        },
      }),
    [getToken],
  );
}
