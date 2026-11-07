"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** Round back button (top-left in the mockups). Falls back to a fixed page when there's no history. */
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="-ml-2 inline-flex size-11 items-center justify-center rounded-full hover:bg-muted"
    >
      <ChevronLeft aria-hidden className="size-6" />
    </button>
  );
}
