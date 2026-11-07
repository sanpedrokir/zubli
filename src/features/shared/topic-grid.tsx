"use client";

import { TOPIC_SLUGS, TOPICS, type Topic } from "./topics";

/** Colourful square topic tiles (the "Explore by Interest" grid in the mockups). Tap again to clear. */
export function TopicGrid({ value, onChange }: { value: Topic | null; onChange: (t: Topic | null) => void }) {
  return (
    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {TOPIC_SLUGS.map((slug) => {
        const { label, Icon, tile } = TOPICS[slug];
        const active = value === slug;
        return (
          <li key={slug}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? null : slug)}
              className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-card p-1 text-center shadow-soft transition-transform hover:scale-[1.03] ${tile} ${
                active ? "ring-4 ring-pink-500 ring-offset-2" : value ? "opacity-60" : ""
              }`}
            >
              <Icon aria-hidden className="size-7" />
              <span className="line-clamp-2 text-[11px] leading-tight font-bold">{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
