# Zubli — Technical Architecture

## Stack
Next.js (App Router, 16.4.5 installed) · TypeScript strict · Tailwind CSS v4 ·
Supabase (Postgres, Auth, Storage, Edge Functions).

## Decisions (and why)

### D1. Static-export-compatible frontend (`output: 'export'`)
**Why:** the roadmap includes PWA then Capacitor; Capacitor bundles static assets. The Next
docs (`01-app/02-guides/static-exports.md`) list as unsupported under export: cookies,
rewrites/redirects/headers, proxy, Server Actions, ISR, the default image loader,
intercepting routes, dynamic routes without `generateStaticParams`, request-dependent
route handlers.
**Consequence:** effectively a client-rendered app with static HTML per route. Server
Components still work but only run at build time.
**Action (Milestone 0):** the scaffold sets `cacheComponents: true` and
`partialPrefetching: true` in `next.config.ts`. These are server-runtime caching/PPR
features. I have not yet run a build to confirm the exact failure, but they conflict with
static export, so M0 removes them, adds `output: 'export'`, and verifies with `next build`.

### D2. No server-only Next features in core code
No Server Actions, `cookies()`, proxy/middleware, API route handlers, default `next/image` loader.
Mutations go straight to Supabase from the client (guarded by RLS) or to Edge Functions.

### D3. Dynamic content routes use query params
User-generated IDs can't be enumerated at build time, so `/post/[id]` would need
`generateStaticParams` over unknown data. Use `/post?id=<uuid>`, `/place?id=…`,
`/u?handle=…` with `useSearchParams` inside `<Suspense>`. Interests are a small known set,
so `/explore/interest/[slug]` may use `generateStaticParams`.

### D4. Supabase client-side; RLS is the security boundary
`@supabase/supabase-js` in the browser, PKCE flow, session in localStorage. The anon key is
public by design, so **every table has RLS with explicit policies**. The service-role key
never reaches the client or git.

### D5. Edge Functions for privileged operations
Moderation, account deletion, upload validation, forge-proof counters if needed, push
tokens, and anything using third-party secrets. Everything else is RLS-guarded CRUD or a
Postgres RPC.

### D6. Consistency logic lives in Postgres
Counters via triggers; feeds and search via RPC with keyset pagination. Keeps clients thin
and identical across web and Capacitor.

### D7. Images: Supabase Storage + custom `next/image` loader
Buckets `avatars` and `post-media`; write access by path prefix `{user_id}/…` via storage
RLS. Client compresses before upload (max 2048px). Display through a custom loader using
Supabase image transformations (`images.loader: 'custom'`). Note: transformations may
require a paid Supabase plan — verify, with a fallback of pre-generated thumbnails at upload.

### D8. Client data fetching with TanStack Query
Caching, infinite pagination, optimistic likes/saves. Needed because per-user data can't
be fetched in Server Components under static export.

### D9. SEO / share links (deferred, known risk)
A static client app is weak for crawlable post pages. Later options: an Edge Function that
serves OG/meta HTML for share URLs, or a separate server-rendered web deployment while the
Capacitor build stays static.

### D10. PWA first, Capacitor later
`app/manifest.ts` + service worker (M7); Capacitor wraps `out/` (M8). Auth redirect URLs
come from config so deep links can be added later. PWA icons need generating from the logo
(it has a white margin and no transparency — crop/pad appropriately, add maskable variant).

## Folder structure
```
src/
  app/                thin routes
  features/           posts, places, interests, auth, comments, search, profile
    <feature>/{components,hooks,queries.ts,types.ts}
  components/ui/      design-system primitives
  lib/supabase/       client.ts, types.gen.ts
  lib/                env.ts, image-loader.ts, format.ts
supabase/             migrations/ functions/ seed.sql config.toml
docs/
public/brand/zubli-icon.png
```

## Environment
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
Secrets only in Supabase function secrets.

## Quality gates
`tsc --noEmit`, ESLint, `next build` (export) in CI; generated DB types committed; RLS
tests (pgTAP or SQL scripts) for every table.
