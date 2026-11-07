"use client";

import { SendHorizontal, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/back-button";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { messageTime } from "@/lib/format";
import { useSession } from "@/lib/neon/use-neon";
import { useConversation, useLoadOlder, useMarkRead, useMessages, useSendMessage, type Message } from "./api";

function Bubble({ m, mine, showSender, showName }: { m: Message; mine: boolean; showSender: boolean; showName: boolean }) {
  return (
    <li className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine && (showSender ? <Avatar name={m.sender_name} src={m.sender_avatar} size={28} /> : <span className="w-7 shrink-0" />)}
      <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
        {showSender && showName && !mine && <span className="mb-0.5 ml-1 text-xs font-bold text-foreground/60">{m.sender_name ?? "Zubli member"}</span>}
        <p
          className={`rounded-3xl px-4 py-2 break-words whitespace-pre-line ${
            mine ? "rounded-br-md bg-pink-500 text-white" : "rounded-bl-md bg-muted text-foreground"
          }`}
        >
          {m.body}
        </p>
        <span className="mx-1 mt-0.5 text-[11px] text-foreground/50">{messageTime(m.created_at)}</span>
      </div>
    </li>
  );
}

function Thread({ id }: { id: string }) {
  const { userId } = useSession();
  const header = useConversation(id);
  const messages = useMessages(id);
  const older = useLoadOlder(id);
  const send = useSendMessage(id);
  const markRead = useMarkRead(id);
  const [text, setText] = useState("");
  const [hasOlder, setHasOlder] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);
  const list = messages.data ?? [];
  const newestId = list[list.length - 1]?.id;
  const isGroup = header.data?.kind === "gathering";

  // Keep the newest message in view, and mark the chat read whenever something new arrives while it's open.
  const { mutate: markReadNow } = markRead;
  useLayoutEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [newestId]);
  useEffect(() => {
    if (newestId) markReadNow();
  }, [newestId, markReadNow]);

  if (header.isPending) return <p className="mt-6 text-foreground/70">Loading…</p>;
  if (header.isError) return <p role="alert" className="mt-6">Couldn&apos;t open this chat.</p>;
  if (!header.data) return <p className="mt-6">This chat doesn&apos;t exist or you&apos;re not part of it.</p>;
  const h = header.data;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || send.isPending) return;
    send.mutate(body, { onSuccess: () => setText("") });
  }

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col md:min-h-[calc(100dvh-6rem)]">
      <header className="sticky top-0 z-[1] -mx-4 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <BackButton fallback="/chats/" />
        {isGroup ? (
          h.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- gathering cover from Blob
            <img src={h.avatar_url} alt="" className="size-10 rounded-xl object-cover" />
          ) : (
            <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-turquoise-500 to-violet-500 text-white">
              <Users className="size-5" />
            </span>
          )
        ) : (
          <Avatar name={h.title} src={h.avatar_url} size={40} />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-extrabold">{h.title ?? "Chat"}</h1>
          {isGroup && h.gathering_id ? (
            <Link href={`/gathering/?id=${h.gathering_id}`} className="text-xs font-bold text-violet-600 underline">
              {h.member_count} members · see gathering
            </Link>
          ) : (
            <p className="text-xs text-foreground/60">Private chat</p>
          )}
        </div>
      </header>

      <div className="flex-1 py-4">
        {messages.isPending && <p className="text-foreground/70">Loading messages…</p>}
        {messages.isError && <p role="alert">Couldn&apos;t load messages.</p>}
        {list.length >= 50 && hasOlder && (
          <div className="mb-3 flex justify-center">
            <button
              type="button"
              onClick={() => older.mutate(undefined, { onSuccess: (more) => setHasOlder(more) })}
              disabled={older.isPending}
              className="min-h-11 rounded-full px-4 text-sm font-bold text-violet-600 hover:bg-muted"
            >
              {older.isPending ? "Loading…" : "Load earlier messages"}
            </button>
          </div>
        )}
        {messages.isSuccess && list.length === 0 && (
          <p className="mt-8 text-center text-foreground/60">{isGroup ? "Say hello to the group 👋" : "Start the conversation 👋"}</p>
        )}
        <ol aria-label="Messages" aria-live="polite" className="flex flex-col gap-2">
          {list.map((m, i) => {
            const mine = m.sender_id === userId;
            const showSender = !mine && list[i - 1]?.sender_id !== m.sender_id;
            return <Bubble key={m.id} m={m} mine={mine} showSender={showSender} showName={isGroup} />;
          })}
        </ol>
        <div ref={bottom} />
      </div>

      <form
        onSubmit={submit}
        className="sticky bottom-20 -mx-4 flex items-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:bottom-0"
      >
        <label htmlFor="message" className="sr-only">
          Message
        </label>
        <textarea
          id="message"
          rows={1}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Write a message…"
          className="max-h-40 min-h-11 flex-1 resize-none rounded-3xl border border-border bg-muted px-4 py-2.5 text-base focus:border-violet-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || send.isPending}
          aria-label="Send"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-pink-500 text-white shadow-soft hover:bg-pink-600 disabled:opacity-50"
        >
          <SendHorizontal aria-hidden className="size-5" />
        </button>
      </form>
      {send.isError && (
        <p role="alert" className="text-sm text-coral-500">
          Couldn&apos;t send: {send.error.message}
        </p>
      )}
    </div>
  );
}

export function ChatThread() {
  const id = useSearchParams().get("id");
  return (
    <SignedInGate message="Sign in to read your chats.">
      {id ? <Thread id={id} /> : <p className="mt-6">No chat selected.</p>}
    </SignedInGate>
  );
}
