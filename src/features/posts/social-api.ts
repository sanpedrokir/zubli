"use client";

import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useNeon } from "@/lib/neon/use-neon";
import { commentSchema, type CommentView, type PostView } from "./schemas";

// Social state lives in small per-post / per-author caches so every card showing the same post
// updates together, and toggles are optimistic (instant UI, rolled back on error).
// Hooks must render under <SignedInGate>.

export interface Engagement {
  liked: boolean;
  saved: boolean;
  likes: number;
  saves: number;
  comments: number;
}
const engagementKey = (postId: string) => ["engagement", postId] as const;
const fromPost = (p: PostView): Engagement => ({
  liked: p.liked,
  saved: p.saved,
  likes: p.likes_count,
  saves: p.saves_count,
  comments: p.comments_count,
});

/** Seeded from the feed row; afterwards the cache (kept current by mutations) is the source of truth. */
export function useEngagement(post: PostView): Engagement {
  const { data } = useQuery({
    queryKey: engagementKey(post.id),
    queryFn: () => fromPost(post),
    initialData: () => fromPost(post),
    staleTime: Infinity,
  });
  return data;
}

const DUPLICATE = "23505"; // already liked/saved/followed: treat as success

export function useToggleEngagement(kind: "like" | "save", postId: string) {
  const neon = useNeon();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (on: boolean) => {
      const table = kind === "like" ? "likes" : "saves";
      const { error } = on
        ? await neon.from(table).insert({ post_id: postId })
        : await neon.from(table).delete().eq("post_id", postId); // RLS limits this to the caller's row
      if (error && error.code !== DUPLICATE) throw new Error(error.message);
    },
    onMutate: async (on) => {
      await qc.cancelQueries({ queryKey: engagementKey(postId) });
      const prev = qc.getQueryData<Engagement>(engagementKey(postId));
      if (prev) {
        const d = on ? 1 : -1;
        qc.setQueryData<Engagement>(
          engagementKey(postId),
          kind === "like"
            ? { ...prev, liked: on, likes: Math.max(prev.likes + d, 0) }
            : { ...prev, saved: on, saves: Math.max(prev.saves + d, 0) },
        );
      }
      return { prev };
    },
    onError: (_err, _on, ctx) => {
      if (ctx?.prev) qc.setQueryData(engagementKey(postId), ctx.prev);
    },
  });
}

// ------------------------------------------------------------------------------------ follows
const followingKey = (userId: string | null | undefined, authorId: string) => ["following", userId, authorId] as const;

export function useIsFollowing(authorId: string) {
  const neon = useNeon();
  const { userId } = useAuth();
  return useQuery({
    queryKey: followingKey(userId, authorId),
    enabled: !!userId && userId !== authorId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await neon
        .from("follows")
        .select("followee_id")
        .eq("follower_id", userId!)
        .eq("followee_id", authorId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data !== null;
    },
  });
}

export function useToggleFollow(authorId: string) {
  const neon = useNeon();
  const qc = useQueryClient();
  const { userId } = useAuth();
  const key = followingKey(userId, authorId);
  return useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = on
        ? await neon.from("follows").insert({ followee_id: authorId })
        : await neon.from("follows").delete().eq("follower_id", userId!).eq("followee_id", authorId);
      if (error && error.code !== DUPLICATE) throw new Error(error.message);
    },
    onMutate: async (on) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<boolean>(key);
      qc.setQueryData(key, on);
      return { prev };
    },
    onError: (_e, _on, ctx) => qc.setQueryData(key, ctx?.prev ?? false),
    // The Following feed depends on who you follow.
    onSettled: () => qc.invalidateQueries({ queryKey: ["posts", "feed", "following"] }),
  });
}

// ---------------------------------------------------------------------------------- comments
const commentsKey = (postId: string) => ["comments", postId] as const;
const COMMENT_SELECT = "id,post_id,author_id,body,created_at,profiles(display_name)";

export function useComments(postId: string) {
  const neon = useNeon();
  return useQuery({
    queryKey: commentsKey(postId),
    queryFn: async () => {
      const { data, error } = await neon
        .from("comments")
        .select(COMMENT_SELECT)
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(200);
      if (error) throw new Error(error.message);
      return z.array(commentSchema).parse(data);
    },
  });
}

function bumpComments(qc: ReturnType<typeof useQueryClient>, postId: string, delta: number) {
  const prev = qc.getQueryData<Engagement>(engagementKey(postId));
  if (prev) qc.setQueryData<Engagement>(engagementKey(postId), { ...prev, comments: Math.max(prev.comments + delta, 0) });
}

export function useAddComment(postId: string) {
  const neon = useNeon();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data, error } = await neon.from("comments").insert({ post_id: postId, body }).select(COMMENT_SELECT).single();
      if (error) throw new Error(error.message);
      return commentSchema.parse(data);
    },
    onSuccess: (comment) => {
      qc.setQueryData<CommentView[]>(commentsKey(postId), (old) => [...(old ?? []), comment]);
      bumpComments(qc, postId, 1);
    },
  });
}

export function useDeleteComment(postId: string) {
  const neon = useNeon();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await neon.from("comments").delete().eq("id", commentId);
      if (error) throw new Error(error.message);
      return commentId;
    },
    onSuccess: (commentId) => {
      qc.setQueryData<CommentView[]>(commentsKey(postId), (old) => (old ?? []).filter((c) => c.id !== commentId));
      bumpComments(qc, postId, -1);
    },
  });
}
