"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/segmented";
import { ui } from "@/components/ui/styles";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { timeAgo } from "@/lib/format";
import { useConversations, type Conversation } from "./api";

function Row({ c }: { c: Conversation }) {
  const unread = c.unread_count > 0;
  const preview = c.last_message
    ? c.kind === "gathering" && c.last_sender_name
      ? `${c.last_sender_name}: ${c.last_message}`
      : c.last_message
    : c.kind === "gathering"
      ? "Group chat created. Say hello!"
      : "No messages yet. Say hello!";
  return (
    <Link href={`/chat/?id=${c.id}`} className={`${ui.card} flex items-center gap-3 p-3 transition-colors hover:bg-muted`}>
      {c.kind === "gathering" ? (
        c.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- gathering cover from Blob
          <img src={c.avatar_url} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-turquoise-500 to-violet-500 text-white">
            <Users className="size-6" />
          </span>
        )
      ) : (
        <Avatar name={c.title} src={c.avatar_url} size={48} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={`truncate ${unread ? "font-extrabold" : "font-bold"}`}>{c.title ?? "Chat"}</p>
          <span className="shrink-0 text-xs text-foreground/50">{timeAgo(c.last_message_at)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`truncate text-sm ${unread ? "font-bold text-foreground" : "text-foreground/60"}`}>{preview}</p>
          {unread && (
            <span className="flex min-w-6 shrink-0 items-center justify-center rounded-full bg-pink-500 px-1.5 text-xs font-bold text-white">
              {c.unread_count > 99 ? "99+" : c.unread_count}
              <span className="sr-only"> unread</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

type Tab = "all" | "direct" | "gathering";

function List() {
  const [tab, setTab] = useState<Tab>("all");
  const chats = useConversations();
  const shown = (chats.data ?? []).filter((c) => tab === "all" || c.kind === tab);
  return (
    <>
      <div className="mt-4">
        <Segmented
          label="Which chats"
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All" },
            { value: "direct", label: "People" },
            { value: "gathering", label: "Groups" },
          ]}
        />
      </div>
      {chats.isPending && <p className="mt-6 text-foreground/70">Loading…</p>}
      {chats.isError && (
        <p role="alert" className="mt-6">
          Couldn&apos;t load your chats. Please try again.
        </p>
      )}
      {chats.isSuccess && shown.length === 0 && (
        <div className={`${ui.card} mt-6 p-5`}>
          <p className="font-bold">No chats yet.</p>
          <p className="mt-1 text-foreground/70">
            Tap <strong>Message</strong> on an idea or gathering to talk to someone, or join a gathering to get its group chat.
          </p>
          <Link href="/gatherings/" className={`${ui.primaryButton} mt-4`}>
            Find a gathering
          </Link>
        </div>
      )}
      <ul className="mt-4 flex flex-col gap-2">
        {shown.map((c) => (
          <li key={c.id}>
            <Row c={c} />
          </li>
        ))}
      </ul>
    </>
  );
}

export function ChatList() {
  return (
    <section>
      <h1 className={ui.pageTitle}>Chats</h1>
      <p className="mt-1 text-foreground/70">Talk with people about ideas and gatherings.</p>
      <SignedInGate message="Sign in to see your chats.">
        <List />
      </SignedInGate>
    </section>
  );
}
