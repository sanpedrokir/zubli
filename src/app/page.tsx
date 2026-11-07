import Link from "next/link";
import { LatestFeed } from "@/features/posts/latest-feed";

export default function HomePage() {
  return (
    <section>
      <h1 className="font-display text-4xl font-extrabold">Found something good?</h1>
      <p className="mt-2 text-foreground/70">Discover what people love — your way.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href="/explore/destination/"
          className="rounded-card bg-turquoise-500 p-6 text-navy-900 shadow-soft transition-transform hover:-translate-y-0.5"
        >
          <div aria-hidden className="text-3xl">🧭</div>
          <h2 className="mt-2 font-display text-xl font-extrabold">Explore by Destination</h2>
          <p className="mt-1 text-sm">What&apos;s good in a city, region or spot.</p>
        </Link>
        <Link
          href="/explore/interest/"
          className="rounded-card bg-yellow-500 p-6 text-navy-900 shadow-soft transition-transform hover:-translate-y-0.5"
        >
          <div aria-hidden className="text-3xl">✨</div>
          <h2 className="mt-2 font-display text-xl font-extrabold">Explore by Interest</h2>
          <p className="mt-1 text-sm">Food, sneakers, tech, collectibles — anywhere.</p>
        </Link>
      </div>
      <LatestFeed />
    </section>
  );
}
