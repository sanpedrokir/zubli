import type { Metadata } from "next";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { PostForm } from "@/features/posts/post-form";

export const metadata: Metadata = { title: "Share a find" };

export default function Page() {
  return (
    <section>
      <div className="mb-4 h-1.5 w-16 rounded-full bg-coral-500" />
      <h1 className="font-display text-3xl font-extrabold">Share a find</h1>
      <p className="mt-2 text-foreground/70">Pick what it&apos;s about. Adding a location is always optional.</p>
      <SignedInGate>
        <PostForm />
      </SignedInGate>
    </section>
  );
}
