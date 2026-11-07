import type { ReactNode } from "react";

export function PlaceholderPage({
  title,
  blurb,
  accent = "violet",
  children,
}: {
  title: string;
  blurb: string;
  accent?: "violet" | "turquoise" | "yellow" | "coral";
  children?: ReactNode;
}) {
  const bar = {
    violet: "bg-violet-500",
    turquoise: "bg-turquoise-500",
    yellow: "bg-yellow-500",
    coral: "bg-coral-500",
  }[accent];
  return (
    <section>
      <div className={`mb-4 h-1.5 w-16 rounded-full ${bar}`} />
      <h1 className="font-display text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-foreground/70">{blurb}</p>
      {children}
    </section>
  );
}
