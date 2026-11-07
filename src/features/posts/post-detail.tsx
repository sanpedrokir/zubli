"use client";

import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { usePost } from "./api";
import { CommentsSection } from "./comments-section";
import { FollowButton } from "./follow-button";
import { Meta } from "./post-card";
import { PostActions } from "./post-actions";
import { PostVisual } from "./post-visual";

function Detail({ id }: { id: string | null }) {
  const { data: post, isPending, isError } = usePost(id);
  if (!id) return <p className="mt-6">No post selected.</p>;
  if (isPending) return <p className="mt-6 text-foreground/70">Loading…</p>;
  if (isError) return <p role="alert" className="mt-6">Couldn&apos;t load this post.</p>;
  if (!post) return <p className="mt-6">This post doesn&apos;t exist or isn&apos;t available.</p>;
  return (
    <article className="mt-6 max-w-2xl">
      <PostVisual interestSlug={post.interests.slug} className="mb-4 aspect-[16/9] rounded-sheet shadow-soft" />
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
    <SignedInGate>
      <Detail id={id} />
    </SignedInGate>
  );
}
