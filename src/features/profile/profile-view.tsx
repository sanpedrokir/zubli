"use client";

import { useAuth, useClerk, useUser } from "@clerk/react";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { useMyPosts, useProfile } from "@/features/posts/api";
import { PostVisual } from "@/features/posts/post-visual";

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="font-display text-xl font-extrabold">{value.toLocaleString()}</p>
      <p className="text-sm text-foreground/70">{label}</p>
    </div>
  );
}

function PostsGrid() {
  const feed = useMyPosts();
  if (feed.isPending) return <p className="mt-4 text-foreground/70">Loading…</p>;
  if (feed.isError) return <p role="alert" className="mt-4">Couldn&apos;t load your posts.</p>;
  if (feed.data.length === 0) {
    return (
      <p className="mt-4 text-foreground/70">
        You haven&apos;t shared anything yet.{" "}
        <Link href="/create/" className="font-bold text-pink-500 underline">Share a find</Link>
      </p>
    );
  }
  return (
    <>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {feed.data.map((p) => (
          <li key={p.id}>
            <Link href={`/post/?id=${p.id}`} aria-label={p.title} className="block overflow-hidden rounded-card">
              <PostVisual interestSlug={p.interests.slug} className="aspect-square" />
            </Link>
          </li>
        ))}
      </ul>
      {feed.hasNextPage && (
        <button
          type="button"
          onClick={() => feed.fetchNextPage()}
          disabled={feed.isFetchingNextPage}
          className="mt-4 min-h-11 rounded-full border border-border px-6 font-bold hover:bg-surface disabled:opacity-60"
        >
          {feed.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      )}
    </>
  );
}

function Me() {
  const { userId } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const profile = useProfile(userId);
  const name = profile.data?.display_name ?? user?.fullName ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "You";
  const handle = user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "";
  const avatar = profile.data?.avatar_url ?? (user?.hasImage ? user.imageUrl : null);
  return (
    <>
      <div className="mt-6 flex items-center gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Clerk avatar; static export has no image optimizer
          <img src={avatar} alt="" width={80} height={80} className="size-20 rounded-full border-4 border-pink-500 object-cover" />
        ) : (
          <span aria-hidden className="flex size-20 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-pink-500 font-display text-3xl font-extrabold text-white">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-2xl font-extrabold">{name}</h2>
          {handle && <p className="truncate text-foreground/70">@{handle}</p>}
        </div>
        <button
          type="button"
          onClick={() => signOut({ redirectUrl: "/" })}
          aria-label="Sign out"
          className="flex size-11 items-center justify-center rounded-full border border-border hover:bg-surface"
        >
          <LogOut aria-hidden className="size-5" />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        <Stat value={profile.data?.posts_count ?? 0} label="Posts" />
        <Stat value={profile.data?.followers_count ?? 0} label="Followers" />
        <Stat value={profile.data?.following_count ?? 0} label="Following" />
      </div>

      <div className="mt-6 inline-flex rounded-full bg-surface p-1" role="tablist" aria-label="Profile sections">
        <span role="tab" aria-selected="true" className="rounded-full bg-violet-600 px-5 py-2 font-bold text-white">
          My Posts
        </span>
      </div>
      <PostsGrid />
    </>
  );
}

export function ProfileView() {
  return (
    <section>
      <h1 className="font-display text-2xl font-extrabold">Profile</h1>
      <SignedInGate>
        <Me />
      </SignedInGate>
    </section>
  );
}
