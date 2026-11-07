"use client";

import { useAuth } from "@clerk/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { env } from "@/lib/env";

function Gate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <p className="mt-6 text-foreground/70">Loading…</p>;
  if (!isSignedIn) {
    return (
      <div className="mt-6 rounded-card bg-surface p-4">
        <p>Sign in to continue.</p>
        <Link
          href="/sign-in/"
          className="mt-3 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-6 font-bold text-white shadow-soft hover:bg-violet-500"
        >
          Sign in with email
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

/** Renders children only for signed-in users, and only when Clerk + Neon are configured. */
export function SignedInGate({ children }: { children: ReactNode }) {
  if (!env.clerkPublishableKey || !env.neonDataApiUrl) {
    return (
      <p className="mt-6 rounded-card bg-surface p-4 text-sm">
        Not configured yet. Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
        <code>NEXT_PUBLIC_NEON_DATA_API_URL</code> in <code>.env.local</code>.
      </p>
    );
  }
  return <Gate>{children}</Gate>;
}
