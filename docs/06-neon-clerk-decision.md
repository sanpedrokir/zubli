# ADR: Neon (database) + Clerk (auth) replace Supabase

**Status:** accepted (supersedes the Supabase assumptions in docs 02 and 03).

## Decision
- **Database:** Neon Postgres, accessed from the browser through the **Neon Data API**
  (PostgREST-compatible HTTP) using `@neon/postgrest-js`.
- **Auth:** Clerk, passwordless **email + one-time code** (custom flow with `@clerk/react`).
- **Authorization:** Postgres RLS. The Data API validates the Clerk JWT (JWKS) and exposes the
  token `sub` as `auth.user_id()`; the JWT must carry `"role": "authenticated"`.
- **User creation:** after the OTP succeeds, `ProfileSync` upserts `profiles(id = Clerk user id)`
  (create-if-missing). RLS forces `id = auth.user_id()`.

## Why
Static export (needed for PWA/Capacitor) has no server to hold `DATABASE_URL`. The Data API is the
only Neon path designed for browsers. Clerk's `@clerk/react` is a pure SPA SDK (no middleware).

## Consequences
- `DATABASE_URL` is for migrations/tooling only and must never be exposed to the browser.
- User ids are **text** (`user_...`), not uuid: all `author_id`/`user_id` columns are `text`.
  `auth.users` references in doc 03 are replaced by `profiles(id)`.
- Supabase Storage / Edge Functions are gone. Photo storage (M3) and privileged operations
  (moderation, account deletion) need another service (e.g. Cloudflare R2 + a Worker, or
  Vercel Blob/Functions). Decision deferred to M3.
- Clerk `user.created` webhooks are not used (no server to receive them). Trade-off: if a user
  closes the tab right after OTP, the row is created on their next visit. Deleting a Clerk user
  does not auto-remove the profile; handle later via a serverless function.
- The app works signed-out until keys are configured (providers are skipped without them).

## One-time setup (manual, in dashboards)
1. **Clerk:** create an application; enable *Email address* with *Email verification code* only
   (disable password); copy the Publishable Key.
2. **Clerk JWT template** named `neon` with claims `{ "role": "authenticated" }`.
3. **Neon Console > Data API:** Enable (check "Grant public schema access"); provider *Other*;
   JWKS URL `https://<clerk-frontend-api-domain>/.well-known/jwks.json`; copy the API URL.
4. Run `db/migrations/0001_profiles.sql` (after step 3).
5. Fill `.env.local` (see `.env.example`).
