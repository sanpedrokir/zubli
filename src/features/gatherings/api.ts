"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useEnsureProfile } from "@/features/shared/use-ensure-profile";
import { useNeon, useSession } from "@/lib/neon/use-neon";
import { attendeeSchema, gatheringSchema, type GatheringFormValues } from "./schemas";

export type GatheringWhen = "upcoming" | "past" | "all";

export function useGatherings(
  opts: { when?: GatheringWhen; topic?: string | null; ideaId?: string | null; mine?: boolean; limit?: number; enabled?: boolean } = {},
) {
  const neon = useNeon();
  const { when = "upcoming", topic = null, ideaId = null, mine = false, limit = 50 } = opts;
  return useQuery({
    queryKey: ["gatherings", "list", when, topic, ideaId, mine, limit],
    enabled: opts.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await neon.rpc("list_gatherings", {
        p_when: when,
        p_topic: topic,
        p_idea_id: ideaId,
        p_mine: mine,
        p_limit: limit,
      });
      if (error) throw new Error(error.message);
      return z.array(gatheringSchema).parse(data);
    },
  });
}

export function useGathering(id: string | null) {
  const neon = useNeon();
  return useQuery({
    queryKey: ["gatherings", "one", id],
    enabled: id !== null,
    queryFn: async () => {
      const { data, error } = await neon.rpc("list_gatherings", { p_gathering_id: id, p_when: "all", p_limit: 1 });
      if (error) throw new Error(error.message);
      return z.array(gatheringSchema).parse(data)[0] ?? null;
    },
  });
}

export function useAttendees(gatheringId: string) {
  const neon = useNeon();
  return useQuery({
    queryKey: ["gatherings", "attendees", gatheringId],
    queryFn: async () => {
      const { data, error } = await neon.rpc("gathering_attendees", { p_gathering_id: gatheringId });
      if (error) throw new Error(error.message);
      return z.array(attendeeSchema).parse(data);
    },
  });
}

export function useCreateGathering() {
  const neon = useNeon();
  const ensureProfile = useEnsureProfile();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ values, coverUrl }: { values: GatheringFormValues; coverUrl: string | null }) => {
      await ensureProfile();
      // host_id comes from the column default auth.user_id(). A trigger adds the host as a member + group chat.
      const { data, error } = await neon
        .from("gatherings")
        .insert({ ...values, cover_url: coverUrl })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return z.object({ id: z.uuid() }).parse(data).id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gatherings"] });
      void queryClient.invalidateQueries({ queryKey: ["ideas"] });
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

/** Join (capacity checked in the database) or leave. Joining also adds you to the group chat. */
export function useJoinGathering(gatheringId: string) {
  const neon = useNeon();
  const { userId } = useSession();
  const ensureProfile = useEnsureProfile();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: "join" | "leave") => {
      if (action === "join") {
        await ensureProfile();
        const { error } = await neon.rpc("join_gathering", { p_gathering_id: gatheringId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await neon
          .from("gathering_members")
          .delete()
          .eq("gathering_id", gatheringId)
          .eq("user_id", userId ?? "");
        if (error) throw new Error(error.message);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["gatherings"] });
      void queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

/** Host only (RLS): cancel keeps the record and tells attendees; it can't be undone from the app. */
export function useCancelGathering(gatheringId: string) {
  const neon = useNeon();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await neon.from("gatherings").update({ cancelled: true }).eq("id", gatheringId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["gatherings"] }),
  });
}
