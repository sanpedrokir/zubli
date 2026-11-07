"use client";

import { useAuth, useUser } from "@clerk/react";
import { useEffect, useRef } from "react";
import { env } from "@/lib/env";
import { useNeon } from "@/lib/neon/use-neon";

/**
 * After a successful login, make sure a row exists in `profiles` for this Clerk user.
 * Create-if-missing only (ignoreDuplicates), so later profile edits are never overwritten.
 * RLS guarantees the row's id is the caller's own Clerk user id (see db/migrations/0001_profiles.sql).
 */
export function ProfileSync() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const neon = useNeon();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId || !user || !env.neonDataApiUrl) return;
    if (done.current === userId) return;
    done.current = userId;

    neon
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: user.primaryEmailAddress?.emailAddress ?? null,
          display_name:
            user.fullName ?? user.primaryEmailAddress?.emailAddress?.split("@")[0] ?? null,
          avatar_url: user.hasImage ? user.imageUrl : null,
        },
        { onConflict: "id", ignoreDuplicates: true },
      )
      .then(({ error }) => {
        if (error) {
          done.current = null; // retry on next render/session
          console.error("Profile sync failed:", error.message);
        }
      });
  }, [isSignedIn, userId, user, neon]);

  return null;
}
