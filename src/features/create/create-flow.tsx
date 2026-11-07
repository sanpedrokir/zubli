"use client";

import { useAuth } from "@clerk/react";
import { Briefcase, CalendarDays, ChevronRight, ImagePlus, Lightbulb, Sun, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BackButton } from "@/components/ui/back-button";
import { Cover } from "@/components/ui/cover";
import { Segmented } from "@/components/ui/segmented";
import { ui } from "@/components/ui/styles";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { useCreateGathering } from "@/features/gatherings/api";
import { placeLabel } from "@/features/gatherings/gathering-cards";
import { gatheringFormSchema, type GatheringFormValues } from "@/features/gatherings/schemas";
import { useCreateIdea, useIdea } from "@/features/ideas/api";
import { KindBadge } from "@/features/ideas/idea-cards";
import { ideaFormSchema, type IdeaFormValues } from "@/features/ideas/schemas";
import { TopicGrid } from "@/features/shared/topic-grid";
import { topicStyle, type Topic } from "@/features/shared/topics";
import { formatWhen } from "@/lib/format";
import { photoUploadsEnabled, uploadCoverPhoto, validatePhoto } from "@/lib/media";

type CreateType = "idea" | "gathering";
const STEPS = ["Type & topic", "Details", "Review"] as const;

interface Draft {
  kind: "activity" | "career";
  topic: Topic | null;
  title: string;
  body: string;
  startsAt: string;
  isOnline: boolean;
  location: string;
  capacity: string;
}

const emptyDraft: Draft = { kind: "activity", topic: null, title: "", body: "", startsAt: "", isOnline: false, location: "", capacity: "" };

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mt-2 flex items-start">
      {STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center gap-1 text-center">
            {i > 0 && <span aria-hidden className={`absolute top-4 right-1/2 h-0.5 w-full -translate-x-4 ${done || current ? "bg-pink-500" : "bg-border"}`} />}
            <span
              aria-current={current ? "step" : undefined}
              className={`relative flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                current || done ? "bg-pink-500 text-white" : "bg-muted text-foreground/60"
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-xs ${current ? "font-bold text-pink-500" : "text-foreground/60"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-coral-500">
      {message}
    </p>
  ) : null;
}

/** A picked photo plus its local preview URL (created when picked, revoked when removed or replaced). */
interface PickedPhoto {
  file: File;
  preview: string;
}

function PhotoPicker({ photo, onChange }: { photo: PickedPhoto | null; onChange: (p: PickedPhoto | null) => void }) {
  const [error, setError] = useState<string | null>(null);
  const preview = photo?.preview ?? null;
  const replace = (next: PickedPhoto | null) => {
    if (photo) URL.revokeObjectURL(photo.preview);
    onChange(next);
  };

  if (!photoUploadsEnabled()) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className={ui.label}>Cover photo (optional)</span>
      <div className="flex items-center gap-3">
        {preview ? (
          <span className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob: URL) */}
            <img src={preview} alt="Selected cover" className="size-24 rounded-card object-cover" />
            <button
              type="button"
              onClick={() => replace(null)}
              aria-label="Remove photo"
              className="absolute -top-2 -right-2 flex size-8 items-center justify-center rounded-full bg-navy-900 text-white"
            >
              <X aria-hidden className="size-4" />
            </button>
          </span>
        ) : (
          <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-border text-xs font-bold text-foreground/70 hover:bg-muted focus-within:outline-2 focus-within:outline-violet-500">
            <ImagePlus aria-hidden className="size-6" />
            Add photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (!f) return;
                const problem = validatePhoto(f);
                setError(problem);
                if (!problem) replace({ file: f, preview: URL.createObjectURL(f) });
              }}
            />
          </label>
        )}
        <p className="text-sm text-foreground/60">No photo? We&apos;ll use a colourful cover for the topic.</p>
      </div>
      <FieldError message={error ?? undefined} />
    </div>
  );
}

function Flow() {
  const params = useSearchParams();
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const ideaId = params.get("idea");
  const linkedIdea = useIdea(ideaId);
  const [type, setType] = useState<CreateType>(params.get("type") === "gathering" || ideaId ? "gathering" : "idea");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const createIdea = useCreateIdea();
  const createGathering = useCreateGathering();
  const busy = uploading || createIdea.isPending || createGathering.isPending;

  // Planning a gathering for an idea: start from that idea's topic and title (once, when it loads).
  const idea = linkedIdea.data;
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);
  if (idea && prefilledFrom !== idea.id) {
    setPrefilledFrom(idea.id);
    setDraft((d) => (d.topic ? d : { ...d, topic: idea.topic as Topic, title: d.title || idea.title }));
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function validate(): IdeaFormValues | GatheringFormValues | null {
    const parsed =
      type === "idea"
        ? ideaFormSchema.safeParse({ kind: draft.kind, topic: draft.topic, title: draft.title, body: draft.body })
        : gatheringFormSchema.safeParse({
            topic: draft.topic,
            title: draft.title,
            description: draft.body,
            starts_at_local: draft.startsAt,
            is_online: draft.isOnline,
            location_text: draft.location,
            capacity: draft.capacity,
            idea_id: idea?.id ?? null,
          });
    if (parsed.success) {
      setErrors({});
      return parsed.data;
    }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      next[key] ??= issue.message;
    }
    setErrors(next);
    return null;
  }

  function goNext() {
    if (step === 0) {
      if (!draft.topic) return setErrors({ topic: "Pick a topic" });
      setErrors({});
      return setStep(1);
    }
    if (step === 1 && validate()) setStep(2);
  }

  async function publish() {
    const values = validate();
    if (!values || !userId) return;
    setSubmitError(null);
    try {
      let coverUrl: string | null = null;
      if (photo) {
        setUploading(true);
        coverUrl = await uploadCoverPhoto(photo.file, userId, () => getToken());
        setUploading(false);
      }
      if (type === "idea") {
        const id = await createIdea.mutateAsync({ values: values as IdeaFormValues, coverUrl });
        router.push(`/idea/?id=${id}`);
      } else {
        const id = await createGathering.mutateAsync({ values: values as GatheringFormValues, coverUrl });
        router.push(`/gathering/?id=${id}`);
      }
    } catch (e) {
      setUploading(false);
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  }

  const topic = topicStyle(draft.topic);
  const nextLabel = step === 0 ? "Next: Details" : "Next: Review";

  return (
    <div className="mt-2">
      <Stepper step={step} />

      {step === 0 && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className={ui.label}>What would you like to share?</span>
            <Segmented
              label="What to create"
              value={type}
              onChange={setType}
              options={[
                { value: "idea", label: "An idea", Icon: Lightbulb },
                { value: "gathering", label: "A gathering", Icon: CalendarDays },
              ]}
            />
            <p className="text-sm text-foreground/60">
              {type === "idea"
                ? "Something to try, learn or do next — a hobby, a new career, a way to give back."
                : "A small meetup people can join, with its own group chat."}
            </p>
          </div>

          {type === "idea" && (
            <div className="flex flex-col gap-2">
              <span className={ui.label}>Kind of idea</span>
              <Segmented
                label="Kind of idea"
                value={draft.kind}
                onChange={(v) => set("kind", v)}
                options={[
                  { value: "activity", label: "Activity", Icon: Sun },
                  { value: "career", label: "Career", Icon: Briefcase },
                ]}
              />
            </div>
          )}

          {type === "gathering" && idea && (
            <p className="rounded-card bg-violet-50 p-3 text-sm">
              Planning a gathering for <strong>{idea.title}</strong>
            </p>
          )}

          <div className="flex flex-col gap-2">
            <span className={ui.label}>
              Topic <span className="text-pink-500">*</span>
            </span>
            <TopicGrid value={draft.topic} onChange={(t) => set("topic", t)} />
            <FieldError message={errors.topic} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="mt-6 flex flex-col gap-5">
          <PhotoPicker photo={photo} onChange={setPhoto} />

          <div className="flex flex-col gap-2">
            <label htmlFor="title" className={ui.label}>
              Title <span className="text-pink-500">*</span>
            </label>
            <input
              id="title"
              value={draft.title}
              maxLength={120}
              onChange={(e) => set("title", e.target.value)}
              placeholder={type === "idea" ? "e.g. Learn to restore old furniture" : "e.g. Sunday morning coastal walk"}
              className={ui.input}
            />
            <FieldError message={errors.title} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="body" className={ui.label}>
              {type === "idea" ? "Tell people about it" : "What will you do?"}
            </label>
            <textarea
              id="body"
              rows={5}
              value={draft.body}
              maxLength={4000}
              onChange={(e) => set("body", e.target.value)}
              placeholder={
                type === "idea"
                  ? "Why it's worth trying, how to get started, what you'd love help with…"
                  : "What to expect, what to bring, who it suits…"
              }
              className={`${ui.input} py-3`}
            />
            <p className="self-end text-xs text-foreground/50">{draft.body.length} / 4000</p>
            <FieldError message={errors.body ?? errors.description} />
          </div>

          {type === "gathering" && (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="starts" className={ui.label}>
                  Date & time <span className="text-pink-500">*</span>
                </label>
                <input id="starts" type="datetime-local" value={draft.startsAt} onChange={(e) => set("startsAt", e.target.value)} className={ui.input} />
                <FieldError message={errors.starts_at_local} />
              </div>

              <div className="flex flex-col gap-2">
                <span className={ui.label}>Where</span>
                <Segmented
                  label="In person or online"
                  value={draft.isOnline ? "online" : "person"}
                  onChange={(v) => set("isOnline", v === "online")}
                  options={[
                    { value: "person", label: "In person" },
                    { value: "online", label: "Online" },
                  ]}
                />
                <input
                  aria-label={draft.isOnline ? "Link or platform (optional)" : "Place (optional)"}
                  value={draft.location}
                  maxLength={200}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder={draft.isOnline ? "Link or platform (optional)" : "Place (optional) — or agree it in the chat"}
                  className={ui.input}
                />
                <FieldError message={errors.location_text} />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="capacity" className={ui.label}>
                  Spots (optional)
                </label>
                <input
                  id="capacity"
                  inputMode="numeric"
                  value={draft.capacity}
                  onChange={(e) => set("capacity", e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Leave empty for no limit (you count as one)"
                  className={ui.input}
                />
                <FieldError message={errors.capacity} />
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="mt-6">
          <div className={`${ui.card} overflow-hidden`}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview (blob: URL)
              <img src={photo.preview} alt="" className="aspect-[16/9] w-full object-cover" />
            ) : (
              <Cover topic={draft.topic ?? "other"} className="aspect-[16/9] w-full" />
            )}
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                {type === "idea" && <KindBadge kind={draft.kind} />}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${topic.chip}`}>{topic.label}</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-extrabold">{draft.title}</h2>
              {type === "gathering" && draft.startsAt && (
                <p className="mt-1 text-sm text-foreground/70">
                  {formatWhen(new Date(draft.startsAt).toISOString())} ·{" "}
                  {placeLabel({ is_online: draft.isOnline, location_text: draft.location.trim() || null })}
                  {draft.capacity && ` · ${draft.capacity} spots`}
                </p>
              )}
              {draft.body && <p className="mt-3 whitespace-pre-line text-foreground/80">{draft.body}</p>}
            </div>
          </div>
          {type === "gathering" && (
            <p className="mt-3 text-sm text-foreground/60">You&apos;ll be the host and a group chat is created for everyone who joins.</p>
          )}
          <FieldError message={submitError ?? undefined} />
        </div>
      )}

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} disabled={busy} className={ui.outlineButton}>
            Back
          </button>
        )}
        {step < 2 ? (
          <button type="button" onClick={goNext} className={`${ui.primaryButton} flex-1`}>
            {nextLabel}
            <ChevronRight aria-hidden className="size-5" />
          </button>
        ) : (
          <button type="button" onClick={publish} disabled={busy} className={`${ui.primaryButton} flex-1`}>
            {uploading ? "Uploading photo…" : busy ? "Publishing…" : type === "idea" ? "Share idea" : "Publish gathering"}
          </button>
        )}
      </div>
    </div>
  );
}

export function CreateFlow() {
  return (
    <section>
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="font-display text-2xl font-extrabold">Create</h1>
      </div>
      <SignedInGate message="Sign in to share an idea or organise a gathering.">
        <Flow />
      </SignedInGate>
    </section>
  );
}
