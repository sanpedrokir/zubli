"use client";

import type { LucideIcon } from "lucide-react";

/** Violet pill toggle from the mockups ("Places | Interests", "My Collections | Saved Posts"). */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; Icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 rounded-full bg-muted p-1">
      {options.map(({ value: v, label: l, Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(v)}
            className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-bold transition-colors ${
              active ? "bg-violet-500 text-white shadow-soft" : "text-foreground/70 hover:text-foreground"
            }`}
          >
            {Icon && <Icon aria-hidden className="size-4" />}
            {l}
          </button>
        );
      })}
    </div>
  );
}
