"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useEnsureProfile } from "@/features/shared/use-ensure-profile";
import { env } from "@/lib/env";
import { useNeon, useSession } from "@/lib/neon/use-neon";

/**
 * In-app chat over the Neon Data API. The static app has no websocket server, so open chats poll for new
 * messages every few seconds (only fetching messages newer than the last one we have) and the chat list /
 * unread badge refresh more slowly. A realtime service can replace polling later without schema changes.
 */
const THREAD_POLL_MS = 4000;
const LIST_POLL_MS = 15000;
const PAGE = 50;

export const conversationSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["direct", "gathering"]),
  title: z.string().nullable(),
  avatar_url: z.string().nullable(),
  other_id: z.string().nullable(),
  gathering_id: z.uuid().nullable(),
  last_message: z.string().nullable(),
  last_sender_name: z.string().nullable(),
  last_message_at: z.string(),
  unread_count: z.number(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const conversationHeaderSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["direct", "gathering"]),
  title: z.string().nullable(),
  avatar_url: z.string().nullable(),
  other_id: z.string().nullable(),
  gathering_id: z.uuid().nullable(),
  member_count: z.number(),
});

export const messageSchema = z.object({
  id: z.uuid(),
  sender_id: z.string(),
  sender_name: z.string().nullable(),
  sender_avatar: z.string().nullable(),
  body: z.string(),
  created_at: z.string(),
});
export type Message = z.infer<typeof messageSchema>;

/** Oldest first, no duplicates. */
function merge(a: Message[], b: Message[]): Message[] {
  const byId = new Map<string, Message>();
  for (const m of [...a, ...b]) byId.set(m.id, m);
  return [...byId.values()].sort((x, y) => x.created_at.localeCompare(y.created_at) || x.id.localeCompare(y.id));
}

export function useConversations(enabled = true) {
  const neon = useNeon();
  return useQuery({
    queryKey: ["chats", "list"],
    enabled,
    refetchInterval: LIST_POLL_MS,
    queryFn: async () => {
      const { data, error } = await neon.rpc("my_conversations");
      if (error) throw new Error(error.message);
      return z.array(conversationSchema).parse(data);
    },
  });
}

/** Total unread messages, for the nav badge. */
export function useUnreadCount() {
  const neon = useNeon();
  const { isSignedIn } = useSession();
  return useQuery({
    queryKey: ["chats", "unread"],
    enabled: isSignedIn && env.neonDataApiUrl !== "",
    refetchInterval: LIST_POLL_MS,
    queryFn: async () => {
      const { data, error } = await neon.rpc("my_unread_count");
      if (error) throw new Error(error.message);
      return z.number().parse(data);
    },
  });
}

export function useConversation(id: string | null) {
  const neon = useNeon();
  return useQuery({
    queryKey: ["chats", "header", id],
    enabled: id !== null,
    queryFn: async () => {
      const { data, error } = await neon.rpc("get_conversation", { p_conversation_id: id });
      if (error) throw new Error(error.message);
      return z.array(conversationHeaderSchema).parse(data)[0] ?? null;
    },
  });
}

/** Messages in one chat (oldest first). Each poll only asks for messages newer than the newest we hold. */
export function useMessages(conversationId: string) {
  const neon = useNeon();
  const queryClient = useQueryClient();
  const key = ["chats", "messages", conversationId] as const;
  return useQuery({
    queryKey: key,
    refetchInterval: THREAD_POLL_MS,
    queryFn: async () => {
      const current = queryClient.getQueryData<Message[]>(key) ?? [];
      const newest = current[current.length - 1];
      const { data, error } = await neon.rpc("conversation_messages", {
        p_conversation_id: conversationId,
        p_after: newest?.created_at ?? null,
        p_limit: PAGE,
      });
      if (error) throw new Error(error.message);
      return merge(current, z.array(messageSchema).parse(data));
    },
  });
}

/** Older history, prepended to the cached thread. Returns false when there is nothing older. */
export function useLoadOlder(conversationId: string) {
  const neon = useNeon();
  const queryClient = useQueryClient();
  const key = ["chats", "messages", conversationId] as const;
  return useMutation({
    mutationFn: async () => {
      const current = queryClient.getQueryData<Message[]>(key) ?? [];
      const oldest = current[0];
      if (!oldest) return false;
      const { data, error } = await neon.rpc("conversation_messages", {
        p_conversation_id: conversationId,
        p_before: oldest.created_at,
        p_limit: PAGE,
      });
      if (error) throw new Error(error.message);
      const older = z.array(messageSchema).parse(data);
      queryClient.setQueryData<Message[]>(key, (prev) => merge(older, prev ?? []));
      return older.length === PAGE;
    },
  });
}

export function useSendMessage(conversationId: string) {
  const neon = useNeon();
  const { userId, displayName, avatarUrl } = useSession();
  const ensureProfile = useEnsureProfile();
  const queryClient = useQueryClient();
  const key = ["chats", "messages", conversationId] as const;
  return useMutation({
    mutationFn: async (body: string) => {
      // sender_id comes from the column default auth.user_id(); RLS checks I'm a member of this chat.
      let result = await neon
        .from("messages")
        .insert({ conversation_id: conversationId, body })
        .select("id,sender_id,body,created_at")
        .single();
      if (result.error?.code === "23503") {
        // Missing profile row (foreign key): create it and try once more.
        await ensureProfile();
        result = await neon
          .from("messages")
          .insert({ conversation_id: conversationId, body })
          .select("id,sender_id,body,created_at")
          .single();
      }
      if (result.error) throw new Error(result.error.message);
      const row = z.object({ id: z.uuid(), sender_id: z.string(), body: z.string(), created_at: z.string() }).parse(result.data);
      return { ...row, sender_name: displayName, sender_avatar: avatarUrl } satisfies Message;
    },
    onSuccess: (message) => {
      if (message.sender_id !== userId) return;
      queryClient.setQueryData<Message[]>(key, (prev) => merge(prev ?? [], [message]));
      void queryClient.invalidateQueries({ queryKey: ["chats", "list"] });
    },
  });
}

export function useMarkRead(conversationId: string) {
  const neon = useNeon();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await neon.rpc("mark_conversation_read", { p_conversation_id: conversationId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chats", "unread"] });
      void queryClient.invalidateQueries({ queryKey: ["chats", "list"] });
    },
  });
}

/** Opens (creating if needed) my 1:1 chat with someone and navigates to it. */
export function useStartChat() {
  const neon = useNeon();
  const ensureProfile = useEnsureProfile();
  const router = useRouter();
  return useMutation({
    mutationFn: async (otherId: string) => {
      await ensureProfile();
      const { data, error } = await neon.rpc("start_direct_chat", { p_other_id: otherId });
      if (error) throw new Error(error.message);
      return z.uuid().parse(data);
    },
    onSuccess: (id) => router.push(`/chat/?id=${id}`),
  });
}
