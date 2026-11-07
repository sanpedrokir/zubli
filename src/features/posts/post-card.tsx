"use client";

import Link from "next/link";
import { PostActions } from "./post-actions";
import type { PostView } from "./schemas";

export function Meta({ post }: { post: PostView }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="rounded-full bg-yellow-500 px-3 py-1 font-bold text-navy-900">{post.interests.name}</span>
      {post.places && (
        <span className="rounded-full bg-turquoise-500 px-3 py-1 font-bold text-navy-900">{post.places.name}</span>
      )}
      {post.rating !== null && <span aria-label={`${post.rating} out of 5`}>{"★".repeat(post.rating)}</span>}
      {post.price_band !== null && <span aria-label={`Price ${post.price_band} of 4`}>{"$".repeat(post.price_band)}</span>}
    </div>
  );
}

export function PostCard({ post }: { post: PostView }) {
  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-soft">
      <Meta post={post} />
      <h3 className="mt-2 font-display text-lg font-extrabold">
        <Link href={`/post/?id=${post.id}`} className="hover:underline">
          {post.title}
        </Link>
      </h3>
      {post.body && <p className="mt-1 line-clamp-3 text-foreground/80">{post.body}</p>}
      <p className="mt-2 text-sm text-foreground/60">
        {post.profiles?.display_name ?? "Someone"} · {new Date(post.created_at).toLocaleDateString()}
      </p>
      <PostActions post={post} />
    </article>
  );
}
