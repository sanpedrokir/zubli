"use client";

import { useEffect, useRef } from "react";
import { env } from "@/lib/env";
import { useNeon, useSession } from "@/lib/neon/use-neon";

/**
 * After sign-in, make sure the caller has a `profiles` row (every post, like and comment points at it).
 * Uses the `ensure_profile` database function (db/migrations/0008), which can only ever create the caller's own
 * row and does nothing if it already exists, so later profile edits are never overwritten.
 */
export function ProfileSync() {
  const { isSignedIn, userId, displayName, avatarUrl } = useSession();
  const neon = useNeon();
  const done = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId || !env.neonDataApiUrl) return;
    if (done.current === userId) return;
    done.current = userId;

    void neon.rpc("ensure_profile", { p_display_name: displayName ?? "", p_avatar_url: avatarUrl ?? "" }).then(({ error }) => {
      if (error) {
        done.current = null; // retry on the next render/session
        console.error("Profile sync failed:", error.message);
      }
    });
  }, [isSignedIn, userId, displayName, avatarUrl, neon]);

  return null;
}
