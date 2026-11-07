"use client";

import { useAuth } from "@clerk/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

const signInButton =
  "inline-flex min-h-11 items-center rounded-full bg-pink-500 px-6 font-bold text-white shadow-soft hover:bg-pink-600";

/** Friendly nudge used wherever an action needs an account. */
export function SignInPrompt({ message = "Sign in to continue." }: { message?: string }) {
  return (
    <div className="mt-6 rounded-card bg-surface p-4">
      <p>{message}</p>
      <Link href="/sign-in/" className={`mt-3 ${signInButton}`}>
        Sign in with email
      </Link>
    </div>
  );
}

/**
 * Switch for letting signed-out visitors read content. The database already allows it (migration 0007), but
 * the Neon Data API rejects every request that has no JWT, and a visitor has no Clerk token. Until a visitor
 * access path exists (see docs), reads need a signed-in user. Flip to true once visitors can obtain a token.
 */
const VISITOR_READS = false;

/** Content screens. Visitors read only when VISITOR_READS is on; otherwise they are asked to sign in. */
export function DataGate({ children }: { children: ReactNode }) {
  if (!env.neonDataApiUrl) {
    return (
      <p className="mt-6 rounded-card bg-surface p-4 text-sm">
        Not configured yet. Set <code>NEXT_PUBLIC_NEON_DATA_API_URL</code> in <code>.env.local</code>.
      </p>
    );
  }
  if (VISITOR_READS || !env.clerkPublishableKey) return <>{children}</>;
  return <Gate message="Sign in to see what people are sharing.">{children}</Gate>;
}

function Gate({ children, message }: { children: ReactNode; message?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <p className="mt-6 text-foreground/70">Loading…</p>;
  if (!isSignedIn) return <SignInPrompt message={message} />;
  return <>{children}</>;
}

/** Renders children only for signed-in users (posting, your profile, saved…). */
export function SignedInGate({ children, message }: { children: ReactNode; message?: string }) {
  if (!env.clerkPublishableKey || !env.neonDataApiUrl) {
    return (
      <p className="mt-6 rounded-card bg-surface p-4 text-sm">
        Not configured yet. Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
        <code>NEXT_PUBLIC_NEON_DATA_API_URL</code> in <code>.env.local</code>.
      </p>
    );
  }
  return <Gate message={message}>{children}</Gate>;
}
