"use client";

import Link from "next/link";
import { useSession } from "@/lib/neon/use-neon";
import { useIsFollowing, useToggleFollow } from "./social-api";

/** Hidden on your own posts; visitors are sent to sign in. */
export function FollowButton({ authorId }: { authorId: string }) {
  const { userId, isSignedIn } = useSession();
  if (userId === authorId) return null;
  if (!isSignedIn) {
    return (
      <Link
        href="/sign-in/"
        className="inline-flex min-h-11 items-center rounded-full bg-violet-600 px-5 font-bold text-white shadow-soft hover:bg-violet-500"
      >
        Follow
      </Link>
    );
  }
  return <Button authorId={authorId} />;
}

function Button({ authorId }: { authorId: string }) {
  const { data: following, isPending } = useIsFollowing(authorId);
  const toggle = useToggleFollow(authorId);
  return (
    <button
      type="button"
      aria-pressed={!!following}
      disabled={isPending || toggle.isPending}
      onClick={() => toggle.mutate(!following)}
      className={`min-h-11 rounded-full px-5 font-bold disabled:opacity-60 ${
        following ? "border border-border hover:bg-surface" : "bg-violet-600 text-white shadow-soft hover:bg-violet-500"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
