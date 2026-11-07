"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useEnsureProfile } from "@/features/shared/use-ensure-profile";
import { useNeon } from "@/lib/neon/use-neon";
import { ideaSchema, interestedPersonSchema, type Idea, type IdeaFormValues } from "./schemas";

const PAGE_SIZE = 20;
type Cursor = { created_at: string; id: string };

export function useIdeas(opts: { kind?: string | null; topic?: string | null; authorId?: string | null; enabled?: boolean } = {}) {
  const neon = useNeon();
  const { kind = null, topic = null, authorId = null } = opts;
  return useInfiniteQuery({
    queryKey: ["ideas", "list", kind, topic, authorId],
    enabled: opts.enabled ?? true,
    initialPageParam: null as Cursor | null,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await neon.rpc("list_ideas", {
        p_kind: kind,
        p_topic: topic,
        p_author_id: authorId,
        p_cursor_created_at: pageParam?.created_at ?? null,
        p_cursor_id: pageParam?.id ?? null,
        p_limit: PAGE_SIZE,
      });
      if (error) throw new Error(error.message);
      return z.array(ideaSchema).parse(data);
    },
    getNextPageParam: (last): Cursor | undefined => {
      const tail = last[last.length - 1];
      return last.length < PAGE_SIZE || !tail ? undefined : { created_at: tail.created_at, id: tail.id };
    },
    select: (d) => d.pages.flat(),
  });
}

export function useIdea(id: string | null) {
  const neon = useNeon();
  return useQuery({
    queryKey: ["ideas", "one", id],
    enabled: id !== null,
    queryFn: async () => {
      const { data, error } = await neon.rpc("list_ideas", { p_idea_id: id, p_limit: 1 });
      if (error) throw new Error(error.message);
      return z.array(ideaSchema).parse(data)[0] ?? null;
    },
  });
}

export function useInterestedPeople(ideaId: string, enabled: boolean) {
  const neon = useNeon();
  return useQuery({
    queryKey: ["ideas", "interested", ideaId],
    enabled,
    queryFn: async () => {
      const { data, error } = await neon.rpc("idea_interested_people", { p_idea_id: ideaId });
      if (error) throw new Error(error.message);
      return z.array(interestedPersonSchema).parse(data);
    },
  });
}

export function useCreateIdea() {
  const neon = useNeon();
  const ensureProfile = useEnsureProfile();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ values, coverUrl }: { values: IdeaFormValues; coverUrl: string | null }) => {
      await ensureProfile();
      // author_id comes from the column default auth.user_id(); clients can't send it.
      const { data, error } = await neon
        .from("ideas")
        .insert({ ...values, cover_url: coverUrl })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return z.object({ id: z.uuid() }).parse(data).id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideas"] }),
  });
}

export function useDeleteIdea() {
  const neon = useNeon();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await neon.from("ideas").delete().eq("id", id); // RLS: author only
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideas"] }),
  });
}

const DUPLICATE = "23505";

/** "I'm interested" toggle. */
export function useToggleInterest(idea: Idea) {
  const neon = useNeon();
  const ensureProfile = useEnsureProfile();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (idea.interested_by_me) {
        const { error } = await neon.from("idea_interests").delete().eq("idea_id", idea.id); // RLS: own row only
        if (error) throw new Error(error.message);
      } else {
        await ensureProfile();
        const { error } = await neon.from("idea_interests").insert({ idea_id: idea.id });
        if (error && error.code !== DUPLICATE) throw new Error(error.message);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ideas"] }),
  });
}
