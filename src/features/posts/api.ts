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
  postMediaSchema,
  profileSchema,
  type FeedCursor,
  type PostFormValues,
  type UploadedPhoto,
} from "./schemas";

// These hooks call useNeon()/useAuth(), so they must render under <SignedInGate>.

const FIVE_MIN = 5 * 60 * 1000;
const PAGE_SIZE = 20;

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
      const { data, error } = await neon.rpc("get_post", { p_post_id: id });
      if (error) throw new Error(error.message);
      const [row] = z.array(feedItemSchema).parse(data);
      return row ? feedItemToPost(row) : null;
    },
  });
}

export function useCreatePost() {
  const neon = useNeon();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ values, photos }: { values: PostFormValues; photos: UploadedPhoto[] }) => {
      // author_id is filled by the column default auth.user_id(); clients can't send it.
      const { data, error } = await neon.from("posts").insert(values).select("id").single();
      if (error) throw new Error(error.message);
      const id = z.object({ id: z.uuid() }).parse(data).id;
      if (photos.length > 0) {
        const { error: mediaError } = await neon.from("post_media").insert(
          photos.map((p, position) => ({
            post_id: id,
            storage_path: p.url,
            width: p.width,
            height: p.height,
            position,
            alt_text: values.title,
          })),
        );
        if (mediaError) {
          // Don't leave a half-created post behind: remove it so a retry doesn't duplicate.
          await neon.from("posts").delete().eq("id", id);
          throw new Error(`Couldn't attach your photos: ${mediaError.message}`);
        }
      }
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
}

export function usePostMedia(postId: string | null) {
  const neon = useNeon();
  return useQuery({
    queryKey: ["post-media", postId],
    enabled: postId !== null,
    staleTime: FIVE_MIN,
    queryFn: async () => {
      const { data, error } = await neon
        .from("post_media")
        .select("id,storage_path,width,height,position,alt_text")
        .eq("post_id", postId!)
        .order("position");
      if (error) throw new Error(error.message);
      return z.array(postMediaSchema).parse(data);
    },
  });
}

export type FeedMode = "latest" | "following" | "destination" | "interest" | "author";

/** Infinite keyset-paginated feed over the RPCs. `enabled` lets callers wait for required filters. */
export function useFeed(opts: {
  mode: FeedMode;
  interestId?: string | null;
  placeId?: string | null;
  authorId?: string | null;
  enabled?: boolean;
}) {
  const neon = useNeon();
  const { mode, interestId = null, placeId = null, authorId = null } = opts;
  return useInfiniteQuery({
    queryKey: ["posts", "feed", mode, interestId, placeId, authorId],
    enabled: opts.enabled ?? true,
    initialPageParam: null as FeedCursor | null,
    queryFn: async ({ pageParam }) => {
      const cursor = {
        p_cursor_created_at: pageParam?.created_at ?? null,
        p_cursor_id: pageParam?.id ?? null,
        p_limit: PAGE_SIZE,
      };
      const call =
        mode === "destination"
          ? neon.rpc("explore_destination", { p_place_id: placeId, p_interest_id: interestId, ...cursor })
          : mode === "interest"
            ? neon.rpc("explore_interest", { p_interest_id: interestId, p_place_id: placeId, ...cursor })
            : mode === "following"
              ? neon.rpc("feed_following", cursor)
              : mode === "author"
                ? neon.rpc("posts_by_author", { p_author_id: authorId, ...cursor })
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

export function useMyPosts() {
  const { userId } = useAuth();
  return useFeed({ mode: "author", authorId: userId ?? null, enabled: !!userId });
}

export function useProfile(userId: string | null | undefined) {
  const neon = useNeon();
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await neon
        .from("profiles")
        .select("id,display_name,avatar_url,posts_count,followers_count,following_count")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data ? profileSchema.parse(data) : null;
    },
  });
}
