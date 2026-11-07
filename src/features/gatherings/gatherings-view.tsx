"use client";

import { CalendarDays, History, Plus, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Segmented } from "@/components/ui/segmented";
import { ui } from "@/components/ui/styles";
import { DataGate } from "@/features/auth/signed-in-gate";
import { TopicGrid } from "@/features/shared/topic-grid";
import { TOPICS, type Topic } from "@/features/shared/topics";
import { useGatherings } from "./api";
import { GatheringRow } from "./gathering-cards";

type Tab = "upcoming" | "mine" | "past";

function List() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [topic, setTopic] = useState<Topic | null>(null);
  const list = useGatherings({
    when: tab === "past" ? "past" : tab === "mine" ? "all" : "upcoming",
    mine: tab === "mine",
    topic,
  });

  return (
    <>
      <div className="mt-4">
        <Segmented
          label="Which gatherings"
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: "Upcoming", Icon: CalendarDays },
            { value: "mine", label: "Mine", Icon: Star },
            { value: "past", label: "Past", Icon: History },
          ]}
        />
      </div>

      <section className="mt-6" aria-labelledby="topics-heading">
        <div className="flex items-center justify-between">
          <h2 id="topics-heading" className={ui.sectionTitle}>
            Browse by topic
          </h2>
          {topic && (
            <button type="button" onClick={() => setTopic(null)} className={ui.seeAll}>
              Show all
            </button>
          )}
        </div>
        <div className="mt-3">
          <TopicGrid value={topic} onChange={setTopic} />
        </div>
      </section>

      <section className="mt-6" aria-labelledby="list-heading">
        <h2 id="list-heading" className={ui.sectionTitle}>
          {topic ? TOPICS[topic].label : tab === "mine" ? "Hosting & going" : tab === "past" ? "Past gatherings" : "Coming up"}
        </h2>
        {list.isPending && <p className="mt-3 text-foreground/70">Loading…</p>}
        {list.isError && (
          <p role="alert" className="mt-3">
            Couldn&apos;t load gatherings. Please try again.
          </p>
        )}
        {list.isSuccess && list.data.length === 0 && (
          <div className={`${ui.card} mt-3 p-5`}>
            <p className="font-bold">{tab === "mine" ? "You haven't joined anything yet." : "Nothing planned here yet."}</p>
            <p className="mt-1 text-foreground/70">Small is good: two or three people is a gathering.</p>
            <Link href="/create/?type=gathering" className={`${ui.primaryButton} mt-4`}>
              Organise one
            </Link>
          </div>
        )}
        <ul className="mt-3 flex flex-col gap-3">
          {list.data?.map((g) => (
            <li key={g.id}>
              <GatheringRow gathering={g} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function GatheringsView() {
  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className={ui.pageTitle}>Gatherings</h1>
          <p className="mt-1 text-foreground/70">Small meetups and activities you can join.</p>
        </div>
        <Link href="/create/?type=gathering" className={ui.iconButton} aria-label="Organise a gathering">
          <Plus aria-hidden className="size-5" />
        </Link>
      </div>
      <DataGate>
        <List />
      </DataGate>
    </section>
  );
}
