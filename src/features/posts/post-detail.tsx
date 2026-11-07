"use client";

import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { DataGate } from "@/features/auth/signed-in-gate";
import { usePost, usePostMedia } from "./api";
import type { PostView } from "./schemas";
import { CommentsSection } from "./comments-section";
import { FollowButton } from "./follow-button";
import { Meta } from "./post-card";
import { PostActions } from "./post-actions";
import { PostVisual } from "./post-visual";

/** Cover image first, then any further photos. Falls back to the interest gradient when there are none. */
function Gallery({ post }: { post: PostView }) {
  const media = usePostMedia(post.id);
  const photos = media.data ?? [];
  if (photos.length === 0) {
    return (
      <PostVisual
        interestSlug={post.interests.slug}
        src={post.cover_url}
        alt={post.title}
        className="mb-4 aspect-[16/9] w-full rounded-sheet shadow-soft"
      />
    );
  }
  return (
    <ul className="mb-4 flex snap-x snap-mandatory gap-3 overflow-x-auto" aria-label="Photos">
      {photos.map((m) => (
        <li key={m.id} className="w-full shrink-0 snap-center">
          <PostVisual
            interestSlug={post.interests.slug}
            src={m.storage_path}
            alt={m.alt_text ?? post.title}
            className="aspect-[16/10] w-full rounded-sheet shadow-soft"
          />
        </li>
      ))}
    </ul>
  );
}

function Detail({ id }: { id: string | null }) {
  const { data: post, isPending, isError } = usePost(id);
  if (!id) return <p className="mt-6">No post selected.</p>;
  if (isPending) return <p className="mt-6 text-foreground/70">Loading…</p>;
  if (isError) return <p role="alert" className="mt-6">Couldn&apos;t load this post.</p>;
  if (!post) return <p className="mt-6">This post doesn&apos;t exist or isn&apos;t available.</p>;
  return (
    <article className="mt-6 max-w-2xl">
      <Gallery post={post} />
      <Meta post={post} />
      <h1 className="mt-3 font-display text-3xl font-extrabold">{post.title}</h1>
      <p className="mt-1 text-sm text-foreground/60">
        by {post.profiles?.display_name ?? "Someone"} · {new Date(post.created_at).toLocaleDateString()}
      </p>
      <div className="mt-2">
        <FollowButton authorId={post.author_id} />
      </div>
      {post.body &&<p className="mt-4 whitespace-pre-wrap text-lg">{post.body}</p>}
      {post.link_url && (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-4 inline-flex min-h-11 items-center font-bold text-violet-600 underline"
        >
          Open link
        </a>
      )}
      <PostActions post={post} />
      <CommentsSection postId={post.id} />
    </article>
  );
}

export function PostDetail() {
  const raw = useSearchParams().get("id");
  const id = raw && z.uuid().safeParse(raw).success ? raw : null;
  return (
    <DataGate>
      <Detail id={id} />
    </DataGate>
  );
}
