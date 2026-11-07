"use client";

import Link from "next/link";
import type { PostView } from "./schemas";
import { useEngagement, useToggleEngagement } from "./social-api";

const btn =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 font-bold hover:bg-background disabled:opacity-60";

/** Like / save / comment count. Optimistic: the UI updates immediately and rolls back on error. */
export function PostActions({ post }: { post: PostView }) {
  const e = useEngagement(post);
  const like = useToggleEngagement("like", post.id);
  const save = useToggleEngagement("save", post.id);
  const failed = like.isError || save.isError;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      <button
        type="button"
        aria-pressed={e.liked}
        aria-label={e.liked ? "Unlike" : "Like"}
        disabled={like.isPending}
        onClick={() => like.mutate(!e.liked)}
        className={`${btn} ${e.liked ? "text-coral-500" : ""}`}
      >
        <span aria-hidden>{e.liked ? "♥" : "♡"}</span>
        <span>{e.likes}</span>
      </button>
      <Link href={`/post/?id=${post.id}`} aria-label={`${e.comments} comments`} className={btn}>
        <span aria-hidden>💬</span>
        <span>{e.comments}</span>
      </Link>
      <button
        type="button"
        aria-pressed={e.saved}
        aria-label={e.saved ? "Remove from saved" : "Save"}
        disabled={save.isPending}
        onClick={() => save.mutate(!e.saved)}
        className={`${btn} ${e.saved ? "text-violet-600" : ""}`}
      >
        <span aria-hidden>{e.saved ? "★" : "☆"}</span>
        <span>{e.saves}</span>
      </button>
      {failed && (
        <span role="alert" className="text-sm text-coral-500">
          Couldn&apos;t save that. Try again.
        </span>
      )}
    </div>
  );
}
