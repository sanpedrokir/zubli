"use client";

import { useAuth, useClerk, useUser } from "@clerk/react";
import Link from "next/link";
import { MyPosts } from "@/features/posts/my-posts";
import { env } from "@/lib/env";

function SignedInPanel() {
  const { user } = useUser();
  const { signOut } = useClerk();
  return (
    <div className="mt-6 flex flex-col gap-3">
      <p>
        Signed in as <strong>{user?.primaryEmailAddress?.emailAddress}</strong>
      </p>
      <button
        type="button"
        onClick={() => signOut({ redirectUrl: "/" })}
        className="min-h-11 w-fit rounded-full border border-border px-6 font-bold hover:bg-surface"
      >
        Sign out
      </button>
      <MyPosts />
    </div>
  );
}

function Panel() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <p className="mt-6 text-foreground/70">Loading…</p>;
  if (isSignedIn) return <SignedInPanel />;
  return (
    <Link
      href="/sign-in/"
      className="mt-6 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-6 font-bold text-white shadow-soft hover:bg-violet-500"
    >
      Sign in with email
    </Link>
  );
}

export function AccountPanel() {
  if (!env.clerkPublishableKey) {
    return (
      <p className="mt-6 rounded-card bg-surface p-4 text-sm">
        Sign-in is not configured yet. Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in{" "}
        <code>.env.local</code>.
      </p>
    );
  }
  return <Panel />;
}
