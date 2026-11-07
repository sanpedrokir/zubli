"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/lib/neon/use-neon";
import { commentFormSchema } from "./schemas";
import { useAddComment, useComments, useDeleteComment } from "./social-api";

export function CommentsSection({ postId }: { postId: string }) {
  const { userId, isSignedIn } = useSession();
  const comments = useComments(postId);
  const add = useAddComment(postId);
  const del = useDeleteComment(postId);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const parsed = commentFormSchema.safeParse({ body: new FormData(form).get("body") });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid comment");
    setError(null);
    add.mutate(parsed.data.body, { onSuccess: () => form.reset() });
  }

  return (
    <section className="mt-8" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="font-display text-xl font-extrabold">
        Comments
      </h2>
      {comments.isPending && <p className="mt-3 text-foreground/70">Loading…</p>}
      {comments.isError && <p role="alert" className="mt-3">Couldn&apos;t load comments.</p>}
      {comments.data?.length === 0 && <p className="mt-3 text-foreground/70">No comments yet.</p>}
      <ul className="mt-3 flex flex-col gap-3">
        {comments.data?.map((c) => (
          <li key={c.id} className="rounded-card bg-surface p-3">
            <p className="text-sm text-foreground/60">
              {c.profiles?.display_name ?? "Someone"} · {new Date(c.created_at).toLocaleDateString()}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
            {c.author_id === userId && (
              <button
                type="button"
                onClick={() => del.mutate(c.id)}
                disabled={del.isPending}
                className="mt-1 min-h-11 text-sm font-bold text-coral-500 disabled:opacity-60"
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      {isSignedIn ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-2">
          <label htmlFor="comment-body" className="font-bold">
            Add a comment
          </label>
          <textarea
            id="comment-body"
            name="body"
            rows={3}
            maxLength={2000}
            aria-invalid={!!error}
            aria-describedby={error ? "comment-error" : undefined}
            className="w-full rounded-card border border-border bg-background px-4 py-3 text-base"
          />
          {error && (
            <p id="comment-error" role="alert" className="text-sm text-coral-500">
              {error}
            </p>
          )}
          {add.isError && (
            <p role="alert" className="text-sm text-coral-500">
              Couldn&apos;t post: {add.error.message}
            </p>
          )}
          <button
            type="submit"
            disabled={add.isPending}
            className="min-h-11 w-fit rounded-full bg-violet-600 px-6 font-bold text-white shadow-soft hover:bg-violet-500 disabled:opacity-60"
          >
            {add.isPending ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : (
        <p className="mt-4">
          <Link href="/sign-in/" className="font-bold text-pink-500 underline">Sign in</Link> to join the conversation.
        </p>
      )}
    </section>
  );
}
