"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/explore/destination/", label: "Destinations", icon: "🧭" },
  { href: "/explore/interest/", label: "Interests", icon: "✨" },
  { href: "/saved/", label: "Saved", icon: "🔖" },
  { href: "/profile/", label: "Me", icon: "🙂" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));
}

function NavLinks({ pathname, className }: { pathname: string; className: string }) {
  return (
    <>
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${className} ${
              active ? "text-violet-600 font-bold" : "text-foreground/70 hover:text-foreground"
            }`}
          >
            <span aria-hidden className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:gap-2 md:border-r md:border-border md:p-4 md:sticky md:top-0 md:h-dvh">
        <Link href="/" className="mb-4 flex items-center gap-2">
          <Image src="/brand/zubli-icon.png" alt="Zubli" width={40} height={40} className="rounded-xl" />
          <span className="font-display text-xl font-extrabold">zubli</span>
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          <NavLinks
            pathname={pathname}
            className="flex min-h-11 items-center gap-3 rounded-full px-4 transition-colors hover:bg-surface"
          />
        </nav>
        <Link
          href="/create/"
          className="mt-4 flex min-h-11 items-center justify-center rounded-full bg-violet-600 px-4 font-bold text-white shadow-soft hover:bg-violet-500"
        >
          + Share a find
        </Link>
      </aside>

      <div className="flex min-w-0 flex-col pb-20 md:pb-0">
        {/* Mobile header */}
        <header className="flex items-center gap-2 border-b border-border p-3 md:hidden">
          <Image src="/brand/zubli-icon.png" alt="" width={32} height={32} className="rounded-lg" />
          <span className="font-display text-lg font-extrabold">zubli</span>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-8">{children}</main>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <NavLinks
          pathname={pathname}
          className="flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center text-xs"
        />
      </nav>
      <Link
        href="/create/"
        aria-label="Share a find"
        className="fixed bottom-20 right-4 z-10 flex size-14 items-center justify-center rounded-full bg-coral-500 text-3xl text-white shadow-soft md:hidden"
      >
        +
      </Link>
    </div>
  );
}
