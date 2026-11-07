# ZUBLI — Permanent Project Rules

Read `AGENTS.md` first: this Next.js (16.x) differs from training data. Consult
`node_modules/next/dist/docs/` before writing Next code. Specs live in `docs/`.

## Product (pivot, Nov 2026 — supersedes docs/01 product spec)
- Zubli = people of **any age** share **activity or career ideas**, organise **small gatherings** others can join, and **chat in-app** (1:1 and a group chat per gathering).
- Core objects (db/migrations/0011): `ideas` (kind activity|career, topic), `idea_interests`, `gatherings` (+ `gathering_members`, capacity enforced by `join_gathering()`), `conversations`/`conversation_members`/`messages`.
- Topics are a fixed list shared by ideas and gatherings: `src/features/shared/topics.ts` must match the DB check constraint.
- **Location is NEVER compulsory.** A gathering can be online or "agreed in the chat"; `location_text` is nullable.
- Chat has no realtime server (static export): open threads poll `conversation_messages(p_after)`; list/unread poll slower.
- The old recommendation tables (posts, places, interests, likes…) remain in the DB but are unused by the app.
- Look & feel: light theme from the approved mockups (white, navy text, pink actions/active tab, violet segmented toggles, colourful topic tiles, photo-led cards).

## Stack
Next.js App Router · TypeScript (strict) · Tailwind CSS v4 · Neon Postgres (via Neon Data API) · Clerk (email OTP auth).
See `docs/06-neon-clerk-decision.md`, which supersedes the Supabase assumptions in docs 02/03.
Web first. No React Native, Expo, Swift, Kotlin or Capacitor until Milestone 8.

## Static-export compatibility (hard rule)
Keep the app compatible with `output: 'export'`. Do NOT use: Server Actions, `cookies()`/`headers()`,
proxy/middleware, request-dependent route handlers, rewrites/redirects/headers config, ISR,
Draft Mode, intercepting routes, the default `next/image` loader, `cacheComponents`/PPR.
Dynamic user-content routes use query params (`/post?id=`), not unenumerable `[id]` segments.
Browser APIs only in `useEffect`/client components.

## Neon + Clerk
- The browser talks to Neon only through the Neon Data API (`@neon/postgrest-js`) with the user's Clerk JWT (template `neon`, claim `role: authenticated`). Never use `DATABASE_URL` or a Neon driver in browser code.
- `DATABASE_URL` and Clerk secret keys live only in `.env.local`/tooling, never in `NEXT_PUBLIC_*`, code or git.
- RLS enabled with explicit policies and grants to `authenticated` on every table; use `auth.user_id()` (text Clerk id). User/author ids are `text`.
- Schema changes only via `db/migrations/*.sql`.
- Auth is Clerk email one-time-code via `@clerk/react` (not `@clerk/nextjs`: static export has no middleware). First login creates the `profiles` row (`ProfileSync`).
- Privileged operations (moderation, deletion, secrets) need a serverless function outside the static app (decide in M3/M7).
- Consistency-critical logic (counters, feeds, search) lives in Postgres triggers/RPC; keyset pagination.

## Code
- Feature folders in `src/features/*`; `src/app` stays thin; UI primitives in `src/components/ui`.
- No `any`; validate external input (zod). Client data fetching via TanStack Query.
- Mobile-first and accessible (44px targets, focus rings, alt text, reduced motion).

## Brand
Violet #7864FF · Coral #FF647F · Turquoise #34D9C5 · Yellow #FFBA54 · Navy #18233F.
Activity ideas = turquoise, Career ideas = yellow. Logo: `public/brand/zubli-icon.png` — never alter it.
Use Tailwind theme tokens, not raw hex, in components.

## Workflow
Work milestone by milestone (`docs/05-roadmap.md`). Before finishing: `npm run lint`, `npx tsc --noEmit`, `npm run build`.
Explain significant technical decisions. Confirm before destructive or outward-facing actions.
