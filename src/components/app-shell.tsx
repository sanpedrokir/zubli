"use client";

import { Bookmark, Compass, House, PlusCircle, User, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "Home", Icon: House },
  { href: "/explore/", label: "Explore", Icon: Compass },
  { href: "/create/", label: "Create", Icon: PlusCircle },
  { href: "/saved/", label: "Saved", Icon: Bookmark },
  { href: "/profile/", label: "Profile", Icon: User },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));
}

function NavLinks({ pathname, className }: { pathname: string; className: string }) {
  return (
    <>
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`${className} ${active ? "font-bold text-pink-500" : "text-foreground/70 hover:text-foreground"}`}
          >
            <Icon aria-hidden className="size-6" strokeWidth={active ? 2.5 : 2} />
            <span>{label}</span>
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
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-2 md:border-r md:border-border md:p-4">
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
      </aside>

      <div className="flex min-w-0 flex-col pb-24 md:pb-0">
        {/* Mobile brand bar */}
        <header className="flex items-center gap-2 px-4 pt-3 md:hidden">
          <Image src="/brand/zubli-icon.png" alt="" width={28} height={28} className="rounded-lg" />
          <span className="font-display text-lg font-extrabold">zubli</span>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-8">{children}</main>
      </div>

      {/* Mobile bottom tabs */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 flex justify-around rounded-t-sheet border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-soft backdrop-blur md:hidden"
      >
        <NavLinks
          pathname={pathname}
          className="flex min-h-16 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 text-xs"
        />
      </nav>
    </div>
  );
}
