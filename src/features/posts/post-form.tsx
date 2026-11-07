"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCreatePost, useInterests, usePlaces } from "./api";
import { postFormSchema, type InterestOption, type PlaceOption } from "./schemas";

const fieldClass = "min-h-11 w-full rounded-card border border-border bg-background px-4 text-base";
const labelClass = "font-bold";
const hintClass = "text-sm text-foreground/70";

/** "Food › Coffee": parents first (by sort_order), children right after their parent. */
function interestOptions(all: InterestOption[]) {
  const parents = all.filter((i) => !i.parent_id);
  return parents.flatMap((p) => [
    { id: p.id, label: p.name },
    ...all.filter((c) => c.parent_id === p.id).map((c) => ({ id: c.id, label: `${p.name} › ${c.name}` })),
  ]);
}

/** "Lisbon, Portugal": walk up the parent chain. */
function placeOptions(all: PlaceOption[]) {
  const byId = new Map(all.map((p) => [p.id, p]));
  const label = (p: PlaceOption) => {
    const parts = [p.name];
    for (let cur = p.parent_id ? byId.get(p.parent_id) : undefined; cur; cur = cur.parent_id ? byId.get(cur.parent_id) : undefined) {
      parts.push(cur.name);
    }
    return parts.join(", ");
  };
  return all.filter((p) => p.kind !== "country").map((p) => ({ id: p.id, label: label(p) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const orNull = (v: string) => (v.trim() === "" ? null : v.trim());
const numOrNull = (v: string) => (v === "" ? null : Number(v));

export function PostForm() {
  const router = useRouter();
  const interests = useInterests();
  const places = usePlaces();
  const create = useCreatePost();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const interestChoices = useMemo(() => interestOptions(interests.data ?? []), [interests.data]);
  const placeChoices = useMemo(() => placeOptions(places.data ?? []), [places.data]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    const parsed = postFormSchema.safeParse({
      interest_id: get("interest_id"),
      place_id: orNull(get("place_id")),
      title: get("title"),
      body: orNull(get("body")),
      rating: numOrNull(get("rating")),
      price_band: numOrNull(get("price_band")),
      link_url: orNull(get("link_url")),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    create.mutate(parsed.data, { onSuccess: (id) => router.push(`/post/?id=${id}`) });
  }

  const err = (k: string) =>
    errors[k] ? (
      <p id={`${k}-error`} role="alert" className="text-sm text-coral-500">
        {errors[k]}
      </p>
    ) : null;
  const aria = (k: string) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  if (interests.isError || places.isError) {
    return (
      <p role="alert" className="mt-6 rounded-card bg-surface p-4 text-sm">
        Couldn&apos;t load the form data. Check your connection and try again.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 flex max-w-xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="interest_id" className={labelClass}>What is it about? *</label>
        <select id="interest_id" name="interest_id" defaultValue="" required className={fieldClass} {...aria("interest_id")}>
          <option value="" disabled>Choose an interest…</option>
          {interestChoices.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        {err("interest_id")}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={labelClass}>Title *</label>
        <input id="title" name="title" maxLength={140} required className={fieldClass} {...aria("title")} />
        {err("title")}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="body" className={labelClass}>Why do you recommend it?</label>
        <textarea id="body" name="body" rows={5} maxLength={5000} className={`${fieldClass} py-3`} {...aria("body")} />
        {err("body")}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="place_id" className={labelClass}>Location (optional)</label>
        <select id="place_id" name="place_id" defaultValue="" className={fieldClass}>
          <option value="">No location</option>
          {placeChoices.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
        <p className={hintClass}>Not everything has a place — skip this for gear, collectibles, online finds…</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="rating" className={labelClass}>Rating</label>
          <select id="rating" name="rating" defaultValue="" className={fieldClass}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{"★".repeat(n)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="price_band" className={labelClass}>Price</label>
          <select id="price_band" name="price_band" defaultValue="" className={fieldClass}>
            <option value="">—</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>{"$".repeat(n)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="link_url" className={labelClass}>Link (optional)</label>
        <input id="link_url" name="link_url" type="url" inputMode="url" placeholder="https://" className={fieldClass} {...aria("link_url")} />
        {err("link_url")}
      </div>

      <p className={hintClass}>Photos are coming soon.</p>

      {create.isError && (
        <p role="alert" className="text-sm text-coral-500">
          Couldn&apos;t publish: {create.error.message}
        </p>
      )}
      <button
        type="submit"
        disabled={create.isPending || interests.isPending}
        className="min-h-11 rounded-full bg-violet-600 px-6 font-bold text-white shadow-soft hover:bg-violet-500 disabled:opacity-60"
      >
        {create.isPending ? "Publishing…" : "Publish"}
      </button>
    </form>
  );
}
