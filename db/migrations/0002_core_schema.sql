-- M2: core data model (interests, places, tags, posts, post_media, post_tags).
-- Run AFTER 0001_profiles.sql, with DATABASE_URL (owner role). Idempotent where practical.
-- Write access to interests / non-city places is intentionally NOT granted to `authenticated`:
-- those are managed by migrations/seed (admin) only.

create extension if not exists pg_trgm;
create extension if not exists citext;

-- ---------------------------------------------------------------- interests
create table if not exists public.interests (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.interests (id) on delete restrict,
  slug       text not null unique,
  name       text not null,
  icon       text,
  color      text,
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists interests_parent_idx on public.interests (parent_id);
create index if not exists interests_name_trgm on public.interests using gin (name gin_trgm_ops);

alter table public.interests enable row level security;
drop policy if exists interests_select on public.interests;
create policy interests_select on public.interests
  for select to authenticated using (is_active);
grant select on public.interests to authenticated;

-- ------------------------------------------------------------------- places
do $$ begin
  create type public.place_kind as enum ('country', 'region', 'city', 'neighborhood', 'venue');
exception when duplicate_object then null; end $$;

create table if not exists public.places (
  id           uuid primary key default gen_random_uuid(),
  parent_id    uuid references public.places (id) on delete restrict,
  kind         public.place_kind not null,
  name         text not null,
  slug         text not null,
  country_code char(2),
  lat          double precision check (lat between -90 and 90),
  lng          double precision check (lng between -180 and 180),
  external_ref text,
  created_by   text references public.profiles (id) on delete set null default (auth.user_id()),
  verified     boolean not null default false,
  posts_count  integer not null default 0,
  ancestor_ids uuid[] not null default '{}',
  created_at   timestamptz not null default now(),
  unique (parent_id, slug)
);
create index if not exists places_parent_idx on public.places (parent_id);
create index if not exists places_kind_idx on public.places (kind);
create index if not exists places_name_trgm on public.places using gin (name gin_trgm_ops);
create index if not exists places_ancestors_gin on public.places using gin (ancestor_ids);

-- ancestor_ids = parent's ancestors + parent. Lets "Portugal" include Lisbon venues without recursion.
create or replace function public.places_set_ancestors() returns trigger
language plpgsql as $$
begin
  if new.parent_id is null then
    new.ancestor_ids := '{}';
  else
    select p.ancestor_ids || p.id into new.ancestor_ids from public.places p where p.id = new.parent_id;
    if new.ancestor_ids is null then
      raise exception 'parent place % not found', new.parent_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists places_set_ancestors on public.places;
create trigger places_set_ancestors before insert on public.places
  for each row execute function public.places_set_ancestors();

alter table public.places enable row level security;
drop policy if exists places_select on public.places;
create policy places_select on public.places for select to authenticated using (true);
-- Users may add cities/neighborhoods/venues they create; countries/regions are admin-managed.
drop policy if exists places_insert_user on public.places;
create policy places_insert_user on public.places
  for insert to authenticated
  with check (
    created_by = auth.user_id()
    and kind in ('city', 'neighborhood', 'venue')
    and verified = false
    and parent_id is not null
  );
grant select on public.places to authenticated;
grant insert (parent_id, kind, name, slug, country_code, lat, lng, external_ref, created_by)
  on public.places to authenticated;

-- --------------------------------------------------------------------- tags
create table if not exists public.tags (
  id   uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug = lower(slug)),
  name text not null
);
create index if not exists tags_name_trgm on public.tags using gin (name gin_trgm_ops);

alter table public.tags enable row level security;
drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags for select to authenticated using (true);
drop policy if exists tags_insert on public.tags;
create policy tags_insert on public.tags for insert to authenticated with check (true);
grant select on public.tags to authenticated;
grant insert (slug, name) on public.tags to authenticated;

-- -------------------------------------------------------------------- posts
do $$ begin
  create type public.post_status as enum ('published', 'hidden', 'removed');
exception when duplicate_object then null; end $$;

create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  interest_id    uuid not null references public.interests (id),   -- interest is the REQUIRED axis
  place_id       uuid references public.places (id) on delete set null, -- location is NEVER compulsory
  title          text not null check (char_length(title) between 1 and 140),
  body           text check (char_length(body) <= 5000),
  rating         smallint check (rating between 1 and 5),
  price_band     smallint check (price_band between 1 and 4),
  link_url       text check (link_url ~* '^https?://'),
  status         public.post_status not null default 'published',
  likes_count    integer not null default 0,
  comments_count integer not null default 0,
  saves_count    integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  search         tsvector generated always as (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) stored
);
create index if not exists posts_interest_feed_idx on public.posts (interest_id, created_at desc, id desc);
create index if not exists posts_place_feed_idx on public.posts (place_id, created_at desc, id desc)
  where place_id is not null;
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_search_gin on public.posts using gin (search);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at before update on public.posts
  for each row execute function public.touch_updated_at();

-- places.posts_count maintained by trigger (clients cannot write it).
create or replace function public.posts_sync_place_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.place_id is not null and old.status = 'published' then
    update public.places set posts_count = posts_count - 1 where id = old.place_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.place_id is not null and new.status = 'published' then
    update public.places set posts_count = posts_count + 1 where id = new.place_id;
  end if;
  return null;
end $$;

drop trigger if exists posts_sync_place_count on public.posts;
create trigger posts_sync_place_count after insert or update of place_id, status or delete on public.posts
  for each row execute function public.posts_sync_place_count();

alter table public.posts enable row level security;
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
  for select to authenticated using (status = 'published' or author_id = auth.user_id());
drop policy if exists posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
  for insert to authenticated with check (author_id = auth.user_id() and status = 'published');
drop policy if exists posts_update_own on public.posts;
create policy posts_update_own on public.posts
  for update to authenticated
  using (author_id = auth.user_id()) with check (author_id = auth.user_id());
drop policy if exists posts_delete_own on public.posts;
create policy posts_delete_own on public.posts
  for delete to authenticated using (author_id = auth.user_id());

grant select, delete on public.posts to authenticated;
-- Column-level grants: clients can never write counters or status.
grant insert (interest_id, place_id, title, body, rating, price_band, link_url)
  on public.posts to authenticated;
grant update (interest_id, place_id, title, body, rating, price_band, link_url)
  on public.posts to authenticated;

-- --------------------------------------------------------------- post_media
create table if not exists public.post_media (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts (id) on delete cascade,
  storage_path text not null,  -- storage provider decided in M3
  width        integer check (width > 0),
  height       integer check (height > 0),
  position     smallint not null default 0,
  alt_text     text check (char_length(alt_text) <= 500),
  unique (post_id, position)
);

alter table public.post_media enable row level security;
drop policy if exists post_media_select on public.post_media;
create policy post_media_select on public.post_media
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists post_media_write_own on public.post_media;
create policy post_media_write_own on public.post_media
  for all to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.user_id()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.user_id()));
grant select, insert, update, delete on public.post_media to authenticated;

-- --------------------------------------------------------------- post_tags
create table if not exists public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);
create index if not exists post_tags_tag_idx on public.post_tags (tag_id);

alter table public.post_tags enable row level security;
drop policy if exists post_tags_select on public.post_tags;
create policy post_tags_select on public.post_tags
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists post_tags_write_own on public.post_tags;
create policy post_tags_write_own on public.post_tags
  for all to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.user_id()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = auth.user_id()));
grant select, insert, delete on public.post_tags to authenticated;
