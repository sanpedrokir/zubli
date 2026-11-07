"use client";

import { useCallback } from "react";
import { useNeon, useSession } from "@/lib/neon/use-neon";

/**
 * Every idea, gathering and message points at the author's profile row. ProfileSync creates it after sign-in,
 * but writes call this first too so a slow/failed sync never surfaces as a confusing foreign-key error.
 */
export function useEnsureProfile() {
  const neon = useNeon();
  const { displayName, avatarUrl } = useSession();
  return useCallback(async () => {
    const { error } = await neon.rpc("ensure_profile", { p_display_name: displayName ?? "", p_avatar_url: avatarUrl ?? "" });
    if (error) throw new Error(`Couldn't set up your profile: ${error.message}`);
  }, [neon, displayName, avatarUrl]);
}
