"use client";

import Link from "next/link";
import { PostActions } from "./post-actions";
import { PostVisual } from "./post-visual";
import type { PostView } from "./schemas";

export function Meta({ post }: { post: PostView }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="rounded-full bg-yellow-500 px-3 py-1 font-bold text-navy-900">{post.interests.name}</span>
      {post.places && (
        <span className="rounded-full bg-turquoise-500 px-3 py-1 font-bold text-navy-900">{post.places.name}</span>
      )}
      {post.rating !== null && <span aria-label={`${post.rating} out of 5`} className="text-yellow-500">{"★".repeat(post.rating)}</span>}
      {post.price_band !== null && <span aria-label={`Price ${post.price_band} of 4`}>{"$".repeat(post.price_band)}</span>}
    </div>
  );
}

export function PostCard({ post }: { post: PostView }) {
  return (
    <article className="flex gap-3 rounded-card border border-border bg-surface p-3 shadow-soft">
      <Link href={`/post/?id=${post.id}`} tabIndex={-1} aria-hidden className="shrink-0">
        <PostVisual interestSlug={post.interests.slug} src={post.cover_url} className="size-24 rounded-xl" />
      </Link>
      <div className="min-w-0 flex-1">
        <Meta post={post} />
        <h3 className="mt-1 font-display text-lg font-extrabold leading-tight">
          <Link href={`/post/?id=${post.id}`} className="hover:underline">
            {post.title}
          </Link>
        </h3>
        {post.body && <p className="mt-0.5 line-clamp-2 text-sm text-foreground/80">{post.body}</p>}
        <p className="mt-1 text-xs text-foreground/60">
          {post.profiles.display_name ?? "Someone"} · {new Date(post.created_at).toLocaleDateString()}
        </p>
        <PostActions post={post} />
      </div>
    </article>
  );
}
