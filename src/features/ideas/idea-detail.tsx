"use client";

import { CalendarPlus, Heart } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/back-button";
import { Cover } from "@/components/ui/cover";
import { ui } from "@/components/ui/styles";
import { DataGate } from "@/features/auth/signed-in-gate";
import { MessageButton } from "@/features/chat/message-button";
import { useGatherings } from "@/features/gatherings/api";
import { GatheringRow } from "@/features/gatherings/gathering-cards";
import { topicStyle } from "@/features/shared/topics";
import { timeAgo } from "@/lib/format";
import { useSession } from "@/lib/neon/use-neon";
import { useDeleteIdea, useIdea, useInterestedPeople, useToggleInterest } from "./api";
import { KindBadge } from "./idea-cards";
import type { Idea } from "./schemas";

function InterestedPeople({ idea }: { idea: Idea }) {
  const people = useInterestedPeople(idea.id, true);
  if (people.isPending) return <p className="mt-3 text-foreground/70">Loading…</p>;
  if (people.isError) return <p role="alert" className="mt-3">Couldn&apos;t load who&apos;s interested.</p>;
  if (people.data.length === 0) return <p className="mt-3 text-foreground/70">No one yet. Share the idea, or plan a gathering for it.</p>;
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {people.data.map((p) => (
        <li key={p.user_id} className={`${ui.card} flex items-center gap-3 p-3`}>
          <Avatar name={p.display_name} src={p.avatar_url} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{p.display_name ?? "Zubli member"}</p>
            <p className="text-xs text-foreground/60">Interested {timeAgo(p.created_at)}</p>
          </div>
          <MessageButton userId={p.user_id} variant="compact" />
        </li>
      ))}
    </ul>
  );
}

function RelatedGatherings({ ideaId }: { ideaId: string }) {
  const list = useGatherings({ ideaId, when: "upcoming" });
  if (!list.data?.length) return null;
  return (
    <section className="mt-8" aria-labelledby="related-heading">
      <h2 id="related-heading" className={ui.sectionTitle}>
        Gatherings for this idea
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {list.data.map((g) => (
          <li key={g.id}>
            <GatheringRow gathering={g} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Detail({ id }: { id: string }) {
  const q = useIdea(id);
  const { userId } = useSession();
  const router = useRouter();
  const remove = useDeleteIdea();
  if (q.isPending) return <p className="mt-6 text-foreground/70">Loading…</p>;
  if (q.isError) return <p role="alert" className="mt-6">Couldn&apos;t load this idea.</p>;
  const idea = q.data;
  if (!idea) return <p className="mt-6">This idea doesn&apos;t exist any more.</p>;
  const mine = idea.author_id === userId;
  const topic = topicStyle(idea.topic);

  return (
    <article className="mt-4">
      <Cover topic={idea.topic} src={idea.cover_url} alt={idea.title} className="aspect-[16/10] w-full rounded-sheet shadow-soft" />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <KindBadge kind={idea.kind} className="px-3 py-1" />
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${topic.chip}`}>{topic.label}</span>
      </div>
      <h1 className="mt-2 font-display text-3xl font-extrabold">{idea.title}</h1>
      <div className="mt-3 flex items-center gap-2">
        <Avatar name={idea.author_name} src={idea.author_avatar} size={32} />
        <p className="text-sm">
          <strong>{idea.author_name ?? "A Zubli member"}</strong> · {timeAgo(idea.created_at)}
        </p>
      </div>
      {idea.body && <p className="mt-4 whitespace-pre-line">{idea.body}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        {!mine && <InterestButton idea={idea} />}
        {!mine && <MessageButton userId={idea.author_id} label="Message" />}
        <Link href={`/create/?type=gathering&idea=${idea.id}`} className={mine ? ui.primaryButton : ui.outlineButton}>
          <CalendarPlus aria-hidden className="size-5" />
          Plan a gathering
        </Link>
      </div>
      <p className="mt-2 text-sm text-foreground/60">
        {idea.interested_count} {idea.interested_count === 1 ? "person is" : "people are"} interested
      </p>

      <RelatedGatherings ideaId={idea.id} />

      {mine && (
        <>
          <section className="mt-8" aria-labelledby="interested-heading">
            <h2 id="interested-heading" className={ui.sectionTitle}>
              Who&apos;s interested
            </h2>
            <InterestedPeople idea={idea} />
          </section>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm("Delete this idea? This can't be undone.")) {
                remove.mutate(idea.id, { onSuccess: () => router.push("/profile/") });
              }
            }}
            className={`${ui.outlineButton} mt-8 text-coral-500`}
          >
            Delete idea
          </button>
          {remove.isError && (
            <p role="alert" className="mt-2 text-sm text-coral-500">
              {remove.error.message}
            </p>
          )}
        </>
      )}
    </article>
  );
}

function InterestButton({ idea }: { idea: Idea }) {
  const toggle = useToggleInterest(idea);
  const on = idea.interested_by_me;
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        aria-pressed={on}
        onClick={() => toggle.mutate()}
        disabled={toggle.isPending}
        className={on ? ui.secondaryButton : ui.primaryButton}
      >
        <Heart aria-hidden className="size-5" fill={on ? "currentColor" : "none"} />
        {on ? "Interested" : "I'm interested"}
      </button>
      {toggle.isError && (
        <span role="alert" className="mt-1 text-sm text-coral-500">
          {toggle.error.message}
        </span>
      )}
    </span>
  );
}

export function IdeaDetail() {
  const id = useSearchParams().get("id");
  return (
    <section>
      <BackButton />
      <DataGate>{id ? <Detail id={id} /> : <p className="mt-6">No idea selected.</p>}</DataGate>
    </section>
  );
}
