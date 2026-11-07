# ZUBLI — Permanent Project Rules

Read `AGENTS.md` first: this Next.js (16.x) differs from training data. Consult
`node_modules/next/dist/docs/` before writing Next code. Specs live in `docs/`.

## Product
- Zubli = social discovery/recommendations (travel, food, drinks, shopping, tech, footwear, hobbies, collectibles, anything).
- Two discovery modes: **Explore by Destination** and **Explore by Interest**.
- **Location is NEVER compulsory.** `posts.place_id` is nullable; no UI or API may require a place. Interest is the required axis.

## Stack
Next.js App Router · TypeScript (strict) · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, Edge Functions).
Web first. No React Native, Expo, Swift, Kotlin or Capacitor until Milestone 8.

## Static-export compatibility (hard rule)
Keep the app compatible with `output: 'export'`. Do NOT use: Server Actions, `cookies()`/`headers()`,
proxy/middleware, request-dependent route handlers, rewrites/redirects/headers config, ISR,
Draft Mode, intercepting routes, the default `next/image` loader, `cacheComponents`/PPR.
Dynamic user-content routes use query params (`/post?id=`), not unenumerable `[id]` segments.
Browser APIs only in `useEffect`/client components.

## Supabase
- RLS enabled with explicit policies on every table; schema changes only via `supabase/migrations`.
- Client uses the anon key only. Service-role key and secrets never reach the client or git.
- Privileged operations (moderation, account deletion, upload validation, secrets) go in Edge Functions.
- Consistency-critical logic (counters, feeds, search) lives in Postgres triggers/RPC; keyset pagination.
- Regenerate types to `src/lib/supabase/types.gen.ts` after migrations.

## Code
- Feature folders in `src/features/*`; `src/app` stays thin; UI primitives in `src/components/ui`.
- No `any`; validate external input (zod). Client data fetching via TanStack Query.
- Mobile-first and accessible (44px targets, focus rings, alt text, reduced motion).

## Brand
Violet #7864FF · Coral #FF647F · Turquoise #34D9C5 · Yellow #FFBA54 · Navy #18233F.
Destination mode = turquoise, Interest mode = yellow. Logo: `public/brand/zubli-icon.png` — never alter it.
Use Tailwind theme tokens, not raw hex, in components.

## Workflow
Work milestone by milestone (`docs/05-roadmap.md`). Before finishing: `npm run lint`, `npx tsc --noEmit`, `npm run build`.
Explain significant technical decisions. Confirm before destructive or outward-facing actions.
