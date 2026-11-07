-- Run AFTER enabling the Neon Data API (it provides auth.user_id() and the `authenticated` role).
-- Users are identified by their Clerk user id (text like 'user_2abc...'), read from the JWT `sub`.
create table if not exists public.profiles (
  id           text primary key default (auth.user_id()),
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.user_id());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.user_id()) with check (id = auth.user_id());

-- No delete policy: users cannot delete their profile row from the client.

grant select, insert, update on public.profiles to authenticated;
