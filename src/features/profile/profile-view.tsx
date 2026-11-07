"use client";

import { useAuth, useClerk, useUser } from "@clerk/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Lightbulb, LogOut, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Cover } from "@/components/ui/cover";
import { Segmented } from "@/components/ui/segmented";
import { ui } from "@/components/ui/styles";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { useGatherings } from "@/features/gatherings/api";
import { GatheringRow } from "@/features/gatherings/gathering-cards";
import { useIdeas } from "@/features/ideas/api";
import { useNeon } from "@/lib/neon/use-neon";

const profileSchema = z.object({ id: z.string(), display_name: z.string().nullable(), avatar_url: z.string().nullable() });

function useProfile(userId: string | null | undefined) {
  const neon = useNeon();
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await neon.from("profiles").select("id,display_name,avatar_url").eq("id", userId!).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? profileSchema.parse(data) : null;
    },
  });
}

function useRename(userId: string) {
  const neon = useNeon();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await neon.from("profiles").update({ display_name: name }).eq("id", userId); // RLS: own row only
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl font-extrabold">{value}</p>
      <p className="text-sm text-foreground/70">{label}</p>
    </div>
  );
}

function IdeasGrid({ userId }: { userId: string }) {
  const ideas = useIdeas({ authorId: userId });
  if (ideas.isPending) return <p className="mt-4 text-foreground/70">Loading…</p>;
  if (ideas.isError) return <p role="alert" className="mt-4">Couldn&apos;t load your ideas.</p>;
  if (ideas.data.length === 0) {
    return (
      <p className="mt-4 text-foreground/70">
        You haven&apos;t shared an idea yet.{" "}
        <Link href="/create/" className="font-bold text-pink-500 underline">
          Share one
        </Link>
      </p>
    );
  }
  return (
    <>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {ideas.data.map((i) => (
          <li key={i.id}>
            <Link href={`/idea/?id=${i.id}`} className="relative block overflow-hidden rounded-card">
              <Cover topic={i.topic} src={i.cover_url} className="aspect-square w-full" />
              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-navy-900/75 to-transparent p-2 text-xs leading-tight font-bold text-white">
                <span className="line-clamp-2">{i.title}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {ideas.hasNextPage && (
        <button type="button" onClick={() => ideas.fetchNextPage()} disabled={ideas.isFetchingNextPage} className={`${ui.outlineButton} mt-4`}>
          {ideas.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </>
  );
}

function MyGatherings() {
  const list = useGatherings({ mine: true, when: "all", limit: 100 });
  if (list.isPending) return <p className="mt-4 text-foreground/70">Loading…</p>;
  if (list.isError) return <p role="alert" className="mt-4">Couldn&apos;t load your gatherings.</p>;
  if (list.data.length === 0) {
    return (
      <p className="mt-4 text-foreground/70">
        Nothing yet.{" "}
        <Link href="/gatherings/" className="font-bold text-pink-500 underline">
          Find a gathering
        </Link>
      </p>
    );
  }
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {list.data.map((g) => (
        <li key={g.id}>
          <GatheringRow gathering={g} />
        </li>
      ))}
    </ul>
  );
}

function Me() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const profile = useProfile(userId);
  const ideas = useIdeas({ authorId: userId });
  const gatherings = useGatherings({ mine: true, when: "upcoming" });
  const rename = useRename(userId ?? "");
  const [tab, setTab] = useState<"ideas" | "gatherings">("ideas");
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = profile.data?.display_name ?? user?.fullName ?? email.split("@")[0] ?? "You";
  const avatar = profile.data?.avatar_url ?? (user?.hasImage ? user.imageUrl : null);
  const ideaCount = ideas.data ? `${ideas.data.length}${ideas.hasNextPage ? "+" : ""}` : "–";
  const hosting = gatherings.data?.filter((g) => g.host_id === userId).length;
  const going = gatherings.data?.filter((g) => g.host_id !== userId).length;

  return (
    <>
      <div className="mt-6 flex items-center gap-4">
        <Avatar name={name} src={avatar} size={88} ring />
        <div className="min-w-0 flex-1">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const next = draftName.trim();
                if (next.length < 1 || next.length > 80) return;
                rename.mutate(next, { onSuccess: () => setEditing(false) });
              }}
              className="flex flex-col gap-2"
            >
              <label htmlFor="display-name" className="sr-only">
                Your name
              </label>
              <input id="display-name" value={draftName} maxLength={80} onChange={(e) => setDraftName(e.target.value)} className={ui.input} autoFocus />
              <div className="flex gap-2">
                <button type="submit" disabled={rename.isPending} className={`${ui.primaryButton} px-4`}>
                  Save
                </button>
                <button type="button" onClick={() => setEditing(false)} className={`${ui.outlineButton} px-4`}>
                  Cancel
                </button>
              </div>
              {rename.isError && (
                <p role="alert" className="text-sm text-coral-500">
                  {rename.error.message}
                </p>
              )}
            </form>
          ) : (
            <>
              <h2 className="truncate font-display text-2xl font-extrabold">{name}</h2>
              {email && <p className="truncate text-foreground/70">{email}</p>}
            </>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat value={ideaCount} label="Ideas" />
        <Stat value={hosting ?? "–"} label="Hosting" />
        <Stat value={going ?? "–"} label="Going" />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraftName(name);
              setEditing(true);
            }}
            className={`${ui.secondaryButton} flex-1`}
          >
            <Pencil aria-hidden className="size-4" />
            Edit name
          </button>
        )}
        <button type="button" onClick={() => signOut({ redirectUrl: "/" })} className={ui.outlineButton}>
          <LogOut aria-hidden className="size-4" />
          Sign out
        </button>
      </div>

      <div className="mt-6">
        <Segmented
          label="Show"
          value={tab}
          onChange={setTab}
          options={[
            { value: "ideas", label: "My ideas", Icon: Lightbulb },
            { value: "gatherings", label: "My gatherings", Icon: CalendarDays },
          ]}
        />
      </div>
      {userId && (tab === "ideas" ? <IdeasGrid userId={userId} /> : <MyGatherings />)}
    </>
  );
}

export function ProfileView() {
  return (
    <section>
      <h1 className={ui.pageTitle}>Profile</h1>
      <SignedInGate message="Sign in to see your profile.">
        <Me />
      </SignedInGate>
    </section>
  );
}
