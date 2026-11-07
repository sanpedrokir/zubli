"use client";

import { useAuth } from "@clerk/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ui } from "@/components/ui/styles";
import { env } from "@/lib/env";

/** Friendly nudge used wherever an action needs an account. */
export function SignInPrompt({ message = "Sign in to continue." }: { message?: string }) {
  return (
    <div className={`${ui.card} mt-6 p-5`}>
      <p>{message}</p>
      <Link href="/sign-in/" className={`${ui.primaryButton} mt-3`}>
        Sign in with email
      </Link>
    </div>
  );
}

function NotConfigured({ vars }: { vars: string }) {
  return (
    <p className="mt-6 rounded-card bg-muted p-4 text-sm">
      Not configured yet. Set <code>{vars}</code> in <code>.env.local</code>.
    </p>
  );
}

/**
 * Switch for letting signed-out visitors read content. The Neon Data API rejects every request that has no JWT,
 * and a visitor has no Clerk token, so reads need a signed-in user. Flip to true once visitors can get a token.
 */
const VISITOR_READS = false;

/**
 * Content screens. Visitors read only when VISITOR_READS is on; otherwise they are asked to sign in.
 * `fallback` replaces both the loading text and the sign-in prompt (e.g. `null` for small header widgets).
 */
export function DataGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  if (!env.neonDataApiUrl) return fallback !== undefined ? <>{fallback}</> : <NotConfigured vars="NEXT_PUBLIC_NEON_DATA_API_URL" />;
  if (VISITOR_READS || !env.clerkPublishableKey) return <>{children}</>;
  return (
    <Gate message="Sign in to see ideas, gatherings and chats." fallback={fallback}>
      {children}
    </Gate>
  );
}

function Gate({ children, message, fallback }: { children: ReactNode; message?: string; fallback?: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return fallback !== undefined ? <>{fallback}</> : <p className="mt-6 text-foreground/70">Loading…</p>;
  if (!isSignedIn) return fallback !== undefined ? <>{fallback}</> : <SignInPrompt message={message} />;
  return <>{children}</>;
}

/** Renders children only for signed-in users (creating, chats, your profile…). */
export function SignedInGate({ children, message }: { children: ReactNode; message?: string }) {
  if (!env.clerkPublishableKey || !env.neonDataApiUrl) {
    return <NotConfigured vars="NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and NEXT_PUBLIC_NEON_DATA_API_URL" />;
  }
  return <Gate message={message}>{children}</Gate>;
}
