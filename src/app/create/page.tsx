import type { Metadata } from "next";
import { SignedInGate } from "@/features/auth/signed-in-gate";
import { PostForm } from "@/features/posts/post-form";

export const metadata: Metadata = { title: "Share a find" };

export default function Page() {
  return (
    <section>
      <h1 className="text-center font-display text-2xl font-extrabold">Create Post</h1>
      <SignedInGate>
        <PostForm />
      </SignedInGate>
    </section>
  );
}
