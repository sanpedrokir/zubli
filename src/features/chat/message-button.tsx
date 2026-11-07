"use client";

import { MessageCircle } from "lucide-react";
import { ui } from "@/components/ui/styles";
import { useSession } from "@/lib/neon/use-neon";
import { useStartChat } from "./api";

/** "Message" button that opens (or creates) a private chat with someone. Hidden on your own content. */
export function MessageButton({
  userId,
  label = "Message",
  variant = "secondary",
  className = "",
}: {
  userId: string;
  label?: string;
  variant?: "primary" | "secondary" | "compact";
  className?: string;
}) {
  const { userId: me } = useSession();
  const start = useStartChat();
  if (!me || me === userId) return null;

  const cls =
    variant === "primary"
      ? ui.primaryButton
      : variant === "compact"
        ? "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-violet-50 px-4 text-sm font-bold text-violet-600 hover:bg-violet-500/15 disabled:opacity-60"
        : ui.secondaryButton;
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={() => start.mutate(userId)} disabled={start.isPending} className={`${cls} ${className}`}>
        <MessageCircle aria-hidden className="size-5" />
        {start.isPending ? "Opening…" : label}
      </button>
      {start.isError && (
        <span role="alert" className="mt-1 text-sm text-coral-500">
          {start.error.message}
        </span>
      )}
    </span>
  );
}
