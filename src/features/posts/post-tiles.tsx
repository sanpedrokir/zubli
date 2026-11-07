"use client";

import { ArrowRight, Heart } from "lucide-react";
import Link from "next/link";
import { PostVisual } from "./post-visual";
import type { PostView } from "./schemas";
import { useEngagement } from "./social-api";

/** Big featured card with the title over the image and a round arrow button. */
export function HeroCard({ post }: { post: PostView }) {
  const subtitle = post.places ? `${post.interests.name} · ${post.places.name}` : post.interests.name;
  return (
    <Link
      href={`/post/?id=${post.id}`}
      className="group relative block aspect-[16/10] overflow-hidden rounded-sheet shadow-soft"
    >
      <PostVisual interestSlug={post.interests.slug} src={post.cover_url} className="absolute inset-0 size-full" />
      <div className="absolute inset-0 bg-linear-to-t from-navy-900/70 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-extrabold leading-tight">{post.title}</h2>
          <p className="mt-0.5 truncate text-sm font-medium text-white/90">{subtitle}</p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-navy-900 transition-transform group-hover:translate-x-0.5">
          <ArrowRight aria-hidden className="size-5" />
          <span className="sr-only">Open post</span>
        </span>
      </div>
    </Link>
  );
}

function LikeCount({ post, className }: { post: PostView; className: string }) {
  const e = useEngagement(post);
  return (
    <span className={className}>
      <Heart aria-hidden className="size-4" fill={e.liked ? "currentColor" : "none"} />
      <span>{e.likes}</span>
      <span className="sr-only">likes</span>
    </span>
  );
}

/** Square-ish tile: image, title and like count over a bottom scrim. */
export function TileCard({ post, aspect = "aspect-square" }: { post: PostView; aspect?: string }) {
  return (
    <Link href={`/post/?id=${post.id}`} className={`relative block overflow-hidden rounded-card shadow-soft ${aspect}`}>
      <PostVisual interestSlug={post.interests.slug} src={post.cover_url} className="absolute inset-0 size-full" />
      <div className="absolute inset-0 bg-linear-to-t from-navy-900/70 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3 text-white">
        <h3 className="line-clamp-2 text-sm font-bold leading-tight">{post.title}</h3>
        <LikeCount post={post} className="flex shrink-0 items-center gap-1 text-xs font-bold" />
      </div>
    </Link>
  );
}
