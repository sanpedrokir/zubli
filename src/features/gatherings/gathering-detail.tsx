"use client";

import { CalendarDays, Globe, Lightbulb, MapPin, MessagesSquare, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/back-button";
import { Cover } from "@/components/ui/cover";
import { ui } from "@/components/ui/styles";
import { DataGate } from "@/features/auth/signed-in-gate";
import { MessageButton } from "@/features/chat/message-button";
import { topicStyle } from "@/features/shared/topics";
import { formatWhen } from "@/lib/format";
import { useSession } from "@/lib/neon/use-neon";
import { useState } from "react";
import { useAttendees, useCancelGathering, useGathering, useJoinGathering } from "./api";
import { placeLabel, spotsLabel } from "./gathering-cards";
import type { Gathering } from "./schemas";

function Attendees({ gathering }: { gathering: Gathering }) {
  const attendees = useAttendees(gathering.id);
  if (attendees.isPending) return <p className="mt-3 text-foreground/70">Loading…</p>;
  if (attendees.isError) return <p role="alert" className="mt-3">Couldn&apos;t load who&apos;s going.</p>;
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {attendees.data.map((a) => (
        <li key={a.user_id} className={`${ui.card} flex items-center gap-3 p-3`}>
          <Avatar name={a.display_name} src={a.avatar_url} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{a.display_name ?? "Zubli member"}</p>
            {a.is_host && <p className="text-xs font-bold text-pink-500">Host</p>}
          </div>
          <MessageButton userId={a.user_id} variant="compact" />
        </li>
      ))}
    </ul>
  );
}

function Actions({ gathering: g }: { gathering: Gathering }) {
  const { userId } = useSession();
  const join = useJoinGathering(g.id);
  const cancel = useCancelGathering(g.id);
  const isHost = userId === g.host_id;
  // Same 3-hour grace the database uses in join_gathering(). Read the clock once per mount (render must stay pure).
  const [now] = useState(() => Date.now());
  const isPast = new Date(g.starts_at).getTime() < now - 3 * 60 * 60 * 1000;
  const full = g.capacity !== null && g.attendees_count >= g.capacity;

  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {g.joined_by_me && g.conversation_id && (
          <Link href={`/chat/?id=${g.conversation_id}`} className={ui.primaryButton}>
            <MessagesSquare aria-hidden className="size-5" />
            Open group chat
          </Link>
        )}
        {!g.joined_by_me && !g.cancelled && !isPast && (
          <button type="button" onClick={() => join.mutate("join")} disabled={join.isPending || full} className={ui.primaryButton}>
            {full ? "Full" : join.isPending ? "Joining…" : "Join this gathering"}
          </button>
        )}
        {g.joined_by_me && !isHost && !isPast && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Leave this gathering? You'll also leave its group chat.")) join.mutate("leave");
            }}
            disabled={join.isPending}
            className={ui.outlineButton}
          >
            {join.isPending ? "Leaving…" : "Leave"}
          </button>
        )}
        {!isHost && <MessageButton userId={g.host_id} label="Message host" />}
        {isHost && !g.cancelled && !isPast && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Cancel this gathering for everyone? This can't be undone.")) cancel.mutate();
            }}
            disabled={cancel.isPending}
            className={`${ui.outlineButton} text-coral-500`}
          >
            Cancel gathering
          </button>
        )}
      </div>
      {!g.joined_by_me && !g.cancelled && !isPast && (
        <p className="text-sm text-foreground/60">Joining adds you to the group chat so you can sort out the details together.</p>
      )}
      {(join.isError || cancel.isError) && (
        <p role="alert" className="text-sm text-coral-500">
          {(join.error ?? cancel.error)?.message}
        </p>
      )}
    </div>
  );
}

function Detail({ id }: { id: string }) {
  const q = useGathering(id);
  if (q.isPending) return <p className="mt-6 text-foreground/70">Loading…</p>;
  if (q.isError) return <p role="alert" className="mt-6">Couldn&apos;t load this gathering.</p>;
  const g = q.data;
  if (!g) return <p className="mt-6">This gathering doesn&apos;t exist any more.</p>;
  const PlaceIcon = g.is_online ? Globe : MapPin;
  const topic = topicStyle(g.topic);

  return (
    <article className="mt-4">
      <Cover topic={g.topic} src={g.cover_url} alt={g.title} className="aspect-[16/10] w-full rounded-sheet shadow-soft" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${topic.chip}`}>{topic.label}</span>
        {g.cancelled && <span className="rounded-full bg-coral-500/15 px-3 py-1 text-xs font-bold text-coral-500">Cancelled</span>}
      </div>
      <h1 className="mt-2 font-display text-3xl font-extrabold">{g.title}</h1>

      <div className="mt-3 flex items-center gap-2">
        <Avatar name={g.host_name} src={g.host_avatar} size={32} />
        <p className="text-sm">
          Hosted by <strong>{g.host_name ?? "a Zubli member"}</strong>
        </p>
      </div>

      <ul className={`${ui.card} mt-4 flex flex-col gap-3 p-4`}>
        <li className="flex items-center gap-3">
          <CalendarDays aria-hidden className="size-5 shrink-0 text-pink-500" />
          <span>{formatWhen(g.starts_at)}</span>
        </li>
        <li className="flex items-center gap-3">
          <PlaceIcon aria-hidden className="size-5 shrink-0 text-pink-500" />
          <span>{placeLabel(g)}</span>
        </li>
        <li className="flex items-center gap-3">
          <Users aria-hidden className="size-5 shrink-0 text-pink-500" />
          <span>{spotsLabel(g)}</span>
        </li>
        {g.idea_id && (
          <li className="flex items-center gap-3">
            <Lightbulb aria-hidden className="size-5 shrink-0 text-pink-500" />
            <Link href={`/idea/?id=${g.idea_id}`} className="font-bold text-violet-600 underline">
              {g.idea_title ?? "See the idea"}
            </Link>
          </li>
        )}
      </ul>

      {g.description && <p className="mt-4 whitespace-pre-line">{g.description}</p>}

      <Actions gathering={g} />

      <section className="mt-8" aria-labelledby="going-heading">
        <h2 id="going-heading" className={ui.sectionTitle}>
          Who&apos;s going
        </h2>
        <Attendees gathering={g} />
      </section>
    </article>
  );
}

export function GatheringDetail() {
  const id = useSearchParams().get("id");
  return (
    <section>
      <BackButton fallback="/gatherings/" />
      <DataGate>{id ? <Detail id={id} /> : <p className="mt-6">No gathering selected.</p>}</DataGate>
    </section>
  );
}
