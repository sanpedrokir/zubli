# Zubli — Implementation Roadmap

| # | Milestone | Outcome | Exit criteria |
|---|---|---|---|
| **M0** | **Foundation** | Static-export-ready scaffold | `next.config.ts`: drop `cacheComponents`/`partialPrefetching`, add `output:'export'`, custom image loader; brand tokens + fonts in Tailwind; replace boilerplate page; app shell (bottom tabs mobile / sidebar desktop) with Destination + Interest tabs; lint, typecheck, build scripts; `next build` emits `out/` |
| M1 | Supabase & Auth | Sign-in works | Supabase project + local CLI; env handling; client singleton; magic link + OAuth; profile auto-created by trigger |
| M2 | Schema & seed | Core data model | Migrations for interests, places, posts, media, tags; RLS; seed; generated types |
| M3 | Create & view posts | Core loop | Image pick/compress/upload; create form with *optional* place; post card + detail |
| M4 | Feeds & Explore | Both discovery modes | Latest/Following feeds; Explore by Destination; Explore by Interest; keyset RPCs |
| M5 | Social | Engagement | Likes, saves, comments, follows; trigger counters; optimistic UI |
| M6 | Search & profiles | Findability | `search_all`, profile pages, saved list |
| M7 | Safety & PWA | Launch-ready | Reports/blocks, moderation Edge Functions, manifest + service worker, a11y/perf pass |
| M8 | Capacitor | Native shells | Wrap `out/`, deep links, push (separate decision) |

Risks: static-export SEO (D9); place data quality and dedup; image/transform costs; moderation load.
