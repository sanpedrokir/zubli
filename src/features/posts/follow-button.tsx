"use client";

import { useAuth } from "@clerk/react";
import { useIsFollowing, useToggleFollow } from "./social-api";

/** Hidden on your own posts. */
export function FollowButton({ authorId }: { authorId: string }) {
  const { userId } = useAuth();
  if (!userId || userId === authorId) return null;
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
