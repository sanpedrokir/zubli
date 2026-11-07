"use client";

import { useAuth } from "@clerk/react";
import { ChevronLeft, ImagePlus, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCreatePost, useInterests, usePlaces } from "./api";
import { MAX_PHOTOS, photoUploadsEnabled, uploadPhotos, validatePhoto } from "./media";
import { PostVisual } from "./post-visual";
import { postFormSchema, type InterestOption, type PlaceOption } from "./schemas";

const fieldClass = "min-h-11 w-full rounded-card border border-border bg-background px-4 text-base";
const labelClass = "font-bold";
const hintClass = "text-sm text-foreground/70";
const STEPS = ["Add Photos", "Details", "Review"] as const;

/** "Food › Coffee": parents first (by sort_order), children right after their parent. */
function interestOptions(all: InterestOption[]) {
  const parents = all.filter((i) => !i.parent_id);
  return parents.flatMap((p) => [
    { id: p.id, label: p.name, slug: p.slug },
    ...all.filter((c) => c.parent_id === p.id).map((c) => ({ id: c.id, label: `${p.name} › ${c.name}`, slug: c.slug })),
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
  return all
    .filter((p) => p.kind !== "country")
    .map((p) => ({ id: p.id, label: label(p) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

interface Draft {
  interest_id: string;
  place_id: string;
  title: string;
  body: string;
  rating: number | null;
  price_band: string;
  link_url: string;
}
const EMPTY: Draft = { interest_id: "", place_id: "", title: "", body: "", rating: null, price_band: "", link_url: "" };

const orNull = (v: string) => (v.trim() === "" ? null : v.trim());

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mt-4 flex items-start justify-between" aria-label="Progress">
      {STEPS.map((name, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li key={name} aria-current={active ? "step" : undefined} className="flex flex-1 flex-col items-center gap-1 text-sm">
            <span
              className={`flex size-9 items-center justify-center rounded-full border-2 font-bold ${
                active || done ? "border-pink-500 bg-pink-500 text-white" : "border-border text-foreground/60"
              }`}
            >
              {n}
            </span>
            <span className={active ? "font-bold" : "text-foreground/60"}>{name}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function PostForm() {
  const router = useRouter();
  const interests = useInterests();
  const places = usePlaces();
  const create = useCreatePost();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { userId, getToken } = useAuth();
  const [photos, setPhotos] = useState<{ id: string; file: File; preview: string }[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  // Free the object URLs created for previews when the form goes away.
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotoError(null);
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) {
        setPhotoError(`You can add up to ${MAX_PHOTOS} photos.`);
        break;
      }
      const problem = validatePhoto(file);
      if (problem) {
        setPhotoError(problem);
        continue;
      }
      next.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  function removePhoto(id: string) {
    const gone = photos.find((p) => p.id === id);
    if (gone) URL.revokeObjectURL(gone.preview);
    setPhotos(photos.filter((p) => p.id !== id));
  }

  const interestChoices = useMemo(() => interestOptions(interests.data ?? []), [interests.data]);
  const placeChoices = useMemo(() => placeOptions(places.data ?? []), [places.data]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const parse = () =>
    postFormSchema.safeParse({
      interest_id: draft.interest_id,
      place_id: orNull(draft.place_id),
      title: draft.title,
      body: orNull(draft.body),
      rating: draft.rating,
      price_band: draft.price_band === "" ? null : Number(draft.price_band),
      link_url: orNull(draft.link_url),
    });

  function goReview() {
    const parsed = parse();
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setStep(3);
  }

  async function publish() {
    const parsed = parse();
    if (!parsed.success) return setStep(2);
    setPhotoError(null);
    let uploaded: Awaited<ReturnType<typeof uploadPhotos>> = [];
    if (photos.length > 0) {
      if (!userId) return setPhotoError("You're signed out. Please sign in again.");
      setUploading(true);
      try {
        uploaded = await uploadPhotos(photos.map((p) => p.file), userId, () => getToken());
      } catch (e) {
        setPhotoError(e instanceof Error ? e.message : "Photo upload failed. Please try again.");
        return;
      } finally {
        setUploading(false);
      }
    }
    create.mutate({ values: parsed.data, photos: uploaded }, { onSuccess: (id) => router.push(`/post/?id=${id}`) });
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

  const interest = interestChoices.find((o) => o.id === draft.interest_id);
  const place = placeChoices.find((o) => o.id === draft.place_id);
  const primary =
    "min-h-12 w-full rounded-full bg-pink-500 px-6 font-bold text-white shadow-soft hover:bg-pink-600 disabled:opacity-60";

  return (
    <div className="mt-2 max-w-xl">
      <Stepper step={step} />

      {step === 1 && (
        <div className="mt-6 flex flex-col gap-4">
          <h2 className="font-display text-xl font-extrabold">Add photos</h2>
          {photoUploadsEnabled() ? (
            <>
              <ul className="grid grid-cols-3 gap-3">
                {photos.map((p, i) => (
                  <li key={p.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview */}
                    <img src={p.preview} alt={`Photo ${i + 1} preview`} className="aspect-square w-full rounded-card object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(p.id)}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-navy-900 text-white shadow-soft"
                    >
                      <X aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <li>
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-border text-sm text-foreground/70 hover:bg-surface focus-within:outline-2 focus-within:outline-violet-500">
                      <ImagePlus aria-hidden className="size-6" />
                      Add Photo
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(e) => {
                          addPhotos(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </li>
                )}
              </ul>
              <p className={hintClass}>Up to {MAX_PHOTOS} photos. They&apos;re resized on your device before upload.</p>
              {photoError && (
                <p role="alert" className="text-sm text-coral-500">
                  {photoError}
                </p>
              )}
            </>
          ) : (
            <p className={hintClass}>Photo upload isn&apos;t set up yet. You can share your find without photos.</p>
          )}
          <button type="button" onClick={() => setStep(2)} className={primary}>
            Next: Details
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="title" className={labelClass}>Title *</label>
            <input id="title" value={draft.title} onChange={(e) => set("title", e.target.value)} maxLength={140} className={fieldClass} {...aria("title")} />
            {err("title")}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="interest_id" className={labelClass}>What is it about? *</label>
            <select id="interest_id" value={draft.interest_id} onChange={(e) => set("interest_id", e.target.value)} className={fieldClass} {...aria("interest_id")}>
              <option value="" disabled>Choose an interest…</option>
              {interestChoices.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            {err("interest_id")}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="body" className={labelClass}>My review / notes</label>
            <textarea id="body" rows={5} value={draft.body} onChange={(e) => set("body", e.target.value)} maxLength={5000} className={`${fieldClass} py-3`} {...aria("body")} />
            <p className={`${hintClass} text-right`}>{draft.body.length} / 5000</p>
            {err("body")}
          </div>

          <div className="flex flex-col gap-2">
            <span id="rating-label" className={labelClass}>My rating</span>
            <div role="radiogroup" aria-labelledby="rating-label" className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={draft.rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => set("rating", draft.rating === n ? null : n)}
                  className="flex size-11 items-center justify-center"
                >
                  <Star
                    aria-hidden
                    className={`size-8 ${draft.rating !== null && n <= draft.rating ? "text-yellow-500" : "text-foreground/25"}`}
                    fill={draft.rating !== null && n <= draft.rating ? "currentColor" : "none"}
                  />
                </button>
              ))}
              {draft.rating !== null && <span className="ml-2 font-bold">{draft.rating}.0 / 5.0</span>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="place_id" className={labelClass}>Location (optional)</label>
            <select id="place_id" value={draft.place_id} onChange={(e) => set("place_id", e.target.value)} className={fieldClass}>
              <option value="">No location</option>
              {placeChoices.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <p className={hintClass}>Not everything has a place. Skip this for gear, collectibles, online finds…</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="price_band" className={labelClass}>Price</label>
              <select id="price_band" value={draft.price_band} onChange={(e) => set("price_band", e.target.value)} className={fieldClass}>
                <option value="">—</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>{"$".repeat(n)}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="link_url" className={labelClass}>Link (optional)</label>
              <input id="link_url" type="url" inputMode="url" placeholder="https://" value={draft.link_url} onChange={(e) => set("link_url", e.target.value)} className={fieldClass} {...aria("link_url")} />
              {err("link_url")}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-12 items-center gap-1 rounded-full border border-border px-5 font-bold hover:bg-surface">
              <ChevronLeft aria-hidden className="size-5" /> Back
            </button>
            <button type="button" onClick={goReview} className={primary}>
              Next: Review
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 flex flex-col gap-4">
          <h2 className="font-display text-xl font-extrabold">Review</h2>
          <article className="overflow-hidden rounded-sheet border border-border bg-surface shadow-soft">
            <PostVisual interestSlug={interest?.slug ?? "other"} src={photos[0]?.preview} alt="Cover photo preview" className="aspect-[16/9] w-full" />
            <div className="p-4">
              <p className="text-sm font-bold text-foreground/70">
                {interest?.label ?? "—"}
                {place ? ` · ${place.label}` : ""}
              </p>
              <h3 className="mt-1 font-display text-2xl font-extrabold">{draft.title}</h3>
              {draft.rating !== null && <p className="mt-1 text-yellow-500" aria-label={`${draft.rating} out of 5`}>{"★".repeat(draft.rating)}</p>}
              {draft.body.trim() && <p className="mt-2 whitespace-pre-wrap">{draft.body.trim()}</p>}
            </div>
          </article>
          {photoError && (
            <p role="alert" className="text-sm text-coral-500">
              {photoError}
            </p>
          )}
          {create.isError && (
            <p role="alert" className="text-sm text-coral-500">
              Couldn&apos;t publish: {create.error.message}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)} className="inline-flex min-h-12 items-center gap-1 rounded-full border border-border px-5 font-bold hover:bg-surface">
              <ChevronLeft aria-hidden className="size-5" /> Edit
            </button>
            <button type="button" onClick={publish} disabled={create.isPending || uploading} className={primary}>
              {uploading ? "Uploading photos…" : create.isPending ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
