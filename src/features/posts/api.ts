"use client";

import { useAuth } from "@clerk/react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useNeon } from "@/lib/neon/use-neon";
import {
  feedItemSchema,
  feedItemToPost,
  interestSchema,
  placeOptionSchema,
  POST_SELECT,
  postSchema,
  type FeedCursor,
  type PostFormValues,
} from "./schemas";

// These hooks call useNeon()/useAuth(), so they must render under <SignedInGate>.

const FIVE_MIN = 5 * 60 * 1000;

export function useInterests() {
  const neon = useNeon();
  return useQuery({
    queryKey: ["interests"],
    staleTime: FIVE_MIN,
    queryFn: async () => {
      const { data, error } = await neon
        .from("interests")
        .select("id,parent_id,slug,name,sort_order")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return z.array(interestSchema).parse(data);
    },
  });
}

export function usePlaces() {
  const neon = useNeon();
  return useQuery({
    queryKey: ["places"],
    staleTime: FIVE_MIN,
    queryFn: async () => {
      const { data, error } = await neon
        .from("places")
        .select("id,parent_id,kind,name,posts_count")
        .order("name")
        .limit(500);
      if (error) throw new Error(error.message);
      return z.array(placeOptionSchema).parse(data);
    },
  });
}

export function usePost(id: string | null) {
  const neon = useNeon();
  return useQuery({
    queryKey: ["post", id],
    enabled: id !== null,
    queryFn: async () => {
      const { data, error } = await neon.from("posts").select(POST_SELECT).eq("id", id!).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? postSchema.parse(data) : null;
    },
  });
}

export function useMyPosts() {
  const neon = useNeon();
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["posts", "mine", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await neon
        .from("posts")
        .select(POST_SELECT)
        .eq("author_id", userId!)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(20);
      if (error) throw new Error(error.message);
      return z.array(postSchema).parse(data);
    },
  });
}

export function useCreatePost() {
  const neon = useNeon();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: PostFormValues) => {
      // author_id is filled by the column default auth.user_id(); clients can't send it.
      const { data, error } = await neon.from("posts").insert(values).select("id").single();
      if (error) throw new Error(error.message);
      return z.object({ id: z.uuid() }).parse(data).id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export type FeedMode = "latest" | "destination" | "interest";
const PAGE_SIZE = 20;

/** Infinite keyset-paginated feed over the M4 RPCs. `enabled` lets callers wait for required filters. */
export function useFeed(opts: { mode: FeedMode; interestId: string | null; placeId: string | null; enabled?: boolean }) {
  const neon = useNeon();
  const { mode, interestId, placeId } = opts;
  return useInfiniteQuery({
    queryKey: ["posts", "feed", mode, interestId, placeId],
    enabled: opts.enabled ?? true,
    initialPageParam: null as FeedCursor | null,
    queryFn: async ({ pageParam }) => {
      const cursor = { p_cursor_created_at: pageParam?.created_at ?? null, p_cursor_id: pageParam?.id ?? null, p_limit: PAGE_SIZE };
      const call =
        mode === "destination"
          ? neon.rpc("explore_destination", { p_place_id: placeId, p_interest_id: interestId, ...cursor })
          : mode === "interest"
            ? neon.rpc("explore_interest", { p_interest_id: interestId, p_place_id: placeId, ...cursor })
            : neon.rpc("feed_latest", { p_interest_id: interestId, p_place_id: placeId, ...cursor });
      const { data, error } = await call;
      if (error) throw new Error(error.message);
      return z.array(feedItemSchema).parse(data);
    },
    getNextPageParam: (lastPage): FeedCursor | undefined => {
      const last = lastPage[lastPage.length - 1];
      return lastPage.length < PAGE_SIZE || !last ? undefined : { created_at: last.created_at, id: last.id };
    },
    select: (data) => data.pages.flat().map(feedItemToPost),
  });
}
