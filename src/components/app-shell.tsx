"use client";

import { CalendarDays, House, MessageCircle, PlusCircle, User, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useUnreadCount } from "@/features/chat/api";

const NAV: { href: string; label: string; Icon: LucideIcon; match: string[] }[] = [
  { href: "/", label: "Home", Icon: House, match: ["/idea"] },
  { href: "/gatherings/", label: "Gatherings", Icon: CalendarDays, match: ["/gathering"] },
  { href: "/create/", label: "Create", Icon: PlusCircle, match: [] },
  { href: "/chats/", label: "Chats", Icon: MessageCircle, match: ["/chat"] },
  { href: "/profile/", label: "Profile", Icon: User, match: [] },
];

function isActive(pathname: string, href: string, match: string[]) {
  if (href === "/") return pathname === "/" || match.some((m) => pathname.startsWith(m));
  return pathname.startsWith(href.replace(/\/$/, "")) || match.some((m) => pathname.startsWith(m));
}

function UnreadDot() {
  const unread = useUnreadCount();
  const n = unread.data ?? 0;
  if (n === 0) return null;
  return (
    <span className="absolute -top-1 -right-2 flex min-w-4.5 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] leading-4 font-bold text-white">
      {n > 99 ? "99+" : n}
      <span className="sr-only"> unread</span>
    </span>
  );
}

function NavLinks({ pathname, className }: { pathname: string; className: string }) {
  return (
    <>
      {NAV.map(({ href, label, Icon, match }) => {
        const active = isActive(pathname, href, match);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`${className} ${active ? "font-bold text-pink-500" : "text-foreground/70 hover:text-foreground"}`}
          >
            <span className="relative">
              <Icon aria-hidden className="size-6" strokeWidth={active ? 2.5 : 2} />
              {href === "/chats/" && <UnreadDot />}
            </span>
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
        <Link href="/" aria-label="Zubli home" className="mb-4 flex items-center gap-3">
          <Image src="/brand/zubli-icon.png" alt="Zubli" width={48} height={48} className="rounded-xl" />
          <span className="text-sm text-foreground/60">Ideas · Gatherings · Chats</span>
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          <NavLinks
            pathname={pathname}
            className="flex min-h-11 items-center gap-3 rounded-full px-4 transition-colors hover:bg-muted"
          />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col pb-24 md:pb-0">
        {/* Mobile brand bar */}
        <header className="flex items-center px-4 pt-3 md:hidden">
          <Link href="/" aria-label="Zubli home">
            <Image src="/brand/zubli-icon.png" alt="Zubli" width={36} height={36} className="rounded-lg" />
          </Link>
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
