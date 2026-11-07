"use client";

import { useAuth } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useNeon } from "@/lib/neon/use-neon";
import {
  interestSchema,
  placeOptionSchema,
  POST_SELECT,
  postSchema,
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
        .select("id,parent_id,kind,name")
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
