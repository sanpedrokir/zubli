/** Shared class strings for the look in the approved mockups (pill buttons, soft cards, light inputs). */
export const ui = {
  primaryButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-pink-500 px-6 font-bold text-white shadow-soft transition-colors hover:bg-pink-600 disabled:opacity-60",
  secondaryButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-violet-50 px-6 font-bold text-violet-600 transition-colors hover:bg-violet-500/15 disabled:opacity-60",
  outlineButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-6 font-bold transition-colors hover:bg-muted disabled:opacity-60",
  iconButton:
    "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface transition-colors hover:bg-muted",
  card: "rounded-card border border-border bg-surface shadow-soft",
  input:
    "min-h-11 w-full rounded-card border border-border bg-surface px-4 text-base placeholder:text-foreground/40 focus:border-violet-500 focus:outline-none",
  label: "font-bold",
  chip: "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 font-bold transition-colors",
  chipActive: "bg-pink-500 text-white shadow-soft",
  sectionTitle: "font-display text-xl font-extrabold",
  pageTitle: "font-display text-4xl font-extrabold",
  seeAll: "inline-flex min-h-11 items-center text-sm font-bold text-pink-500",
} as const;
