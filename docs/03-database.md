# Zubli — Database Design (Supabase Postgres)

All tables in `public`, RLS enabled on every one. IDs `uuid default gen_random_uuid()`,
timestamps `timestamptz default now()`. Extensions: `pg_trgm`, `unaccent`, `citext`;
`postgis` post-MVP.

## Tables

**profiles** — 1:1 with `auth.users`
`id (pk, fk auth.users)`, `handle (unique citext)`, `display_name`, `bio`, `avatar_path`,
`home_place_id (fk places, null)`, `followers_count`, `following_count`, `posts_count`, `created_at`.

**interests** — category tree ("Food", "Sneakers", "Collectibles")
`id`, `parent_id (fk interests, null)`, `slug (unique)`, `name`, `icon`, `color`, `sort_order`, `is_active`.

**places** — destination hierarchy; optional everywhere
`id`, `parent_id (fk places, null)`, `kind` enum(country, region, city, neighborhood, venue),
`name`, `slug`, `country_code`, `lat`, `lng`, `external_ref`, `created_by`, `verified bool`,
`posts_count`, `ancestor_ids uuid[]` (GIN-indexed, so "Portugal" includes Lisbon venues
without recursion). Indexes: trigram on `name`, `(parent_id)`, `(kind)`.

**posts** — a recommendation
`id`, `author_id (fk profiles)`, `interest_id (fk interests, NOT NULL)`,
`place_id (fk places, NULL)`, `title`, `body`, `rating smallint null check 1..5`,
`price_band smallint null check 1..4`, `link_url null`, `status` enum(published, hidden, removed),
`likes_count`, `comments_count`, `saves_count`, `created_at`, `updated_at`, `search tsvector` (generated).
Indexes: `(interest_id, created_at desc, id)`; partial `(place_id, created_at desc, id) where place_id is not null`;
`(author_id, created_at desc)`; GIN on `search`.
> The nullable `place_id` is the schema-level enforcement of "location not compulsory".

**post_media** `id, post_id, storage_path, width, height, position, alt_text`
**tags** `id, slug unique, name` · **post_tags** pk `(post_id, tag_id)`
**comments** `id, post_id, author_id, parent_id null, body, status, created_at`
**likes** pk `(post_id, user_id)` · **saves** pk `(post_id, user_id)`
**follows** pk `(follower_id, followee_id)`, check not self
**interest_follows** pk `(user_id, interest_id)` (feeds "For You")
**blocks** pk `(blocker_id, blocked_id)`
**reports** `id, reporter_id, target_type, target_id, reason, status, created_at`
**notifications** — post-MVP

## Row Level Security
| Table | Select | Write |
|---|---|---|
| profiles | public | own row |
| interests | public | admin only |
| places | public | authenticated may insert city/venue with `created_by = auth.uid()`; admin otherwise |
| posts | published and author hasn't blocked viewer; authors see own | author only; `author_id = auth.uid()`; no client writes to counters/status |
| post_media, post_tags | follow parent post | parent post author |
| comments | on visible posts | author; delete own |
| likes, saves | own rows | own rows |
| follows | public | `follower_id = auth.uid()` |
| blocks, reports | own | own insert |

Counters are maintained by `SECURITY DEFINER` triggers; column privileges stop clients
updating counters/status.

## Key RPCs (keyset pagination on `(created_at, id)`)
- `feed_latest(cursor, interest_id?, place_id?)`
- `feed_following(cursor)` — joins follows, excludes blocks
- `explore_destination(place_id, interest_id?, cursor)` — uses `ancestor_ids`
- `explore_interest(interest_id, place_id?, cursor)` — **place filter optional**
- `search_all(q)` — tsvector for posts; trigram for places/people/interests

## Storage
`avatars/{user_id}/…`, `post-media/{user_id}/{post_id}/…`; policies tie first path segment
to `auth.uid()`; size and MIME limits at bucket level.

## Migrations
Versioned SQL in `supabase/migrations`; interests seeded in `seed.sql`; types generated to
`src/lib/supabase/types.gen.ts`.
