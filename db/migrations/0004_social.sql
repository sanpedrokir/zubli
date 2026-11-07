-- M5: social (likes, saves, follows, comments), trigger-maintained counters, and the feed API v2
-- (viewer state, author filter, Following feed). Clients can never write counters or status.

-- ------------------------------------------------- profiles: counters + tighter column grants
alter table public.profiles
  add column if not exists followers_count integer not null default 0,
  add column if not exists following_count integer not null default 0,
  add column if not exists posts_count     integer not null default 0;

-- 0001 granted table-wide insert/update, which would let a user set their own counters.
revoke insert, update on public.profiles from authenticated;
grant insert (id, email, display_name, avatar_url) on public.profiles to authenticated;
grant update (email, display_name, avatar_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------- likes / saves
create table if not exists public.likes (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create table if not exists public.saves (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists saves_user_idx on public.saves (user_id, created_at desc);

-- ---------------------------------------------------------------------------------- follows
create table if not exists public.follows (
  follower_id text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  followee_id text not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

-- --------------------------------------------------------------------------------- comments
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts (id) on delete cascade,
  author_id  text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  parent_id  uuid references public.comments (id) on delete cascade,
  body       text not null check (char_length(btrim(body)) between 1 and 2000),
  status     public.post_status not null default 'published',
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at, id);

-- ------------------------------------------------------------------------------------ RLS
alter table public.likes enable row level security;
alter table public.saves enable row level security;
alter table public.follows enable row level security;
alter table public.comments enable row level security;

drop policy if exists likes_select_own on public.likes;
create policy likes_select_own on public.likes for select to authenticated using (user_id = auth.user_id());
drop policy if exists likes_insert_own on public.likes;
create policy likes_insert_own on public.likes for insert to authenticated
  with check (user_id = auth.user_id() and exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists likes_delete_own on public.likes;
create policy likes_delete_own on public.likes for delete to authenticated using (user_id = auth.user_id());

drop policy if exists saves_select_own on public.saves;
create policy saves_select_own on public.saves for select to authenticated using (user_id = auth.user_id());
drop policy if exists saves_insert_own on public.saves;
create policy saves_insert_own on public.saves for insert to authenticated
  with check (user_id = auth.user_id() and exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists saves_delete_own on public.saves;
create policy saves_delete_own on public.saves for delete to authenticated using (user_id = auth.user_id());

drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows for select to authenticated using (true);
drop policy if exists follows_insert_own on public.follows;
create policy follows_insert_own on public.follows for insert to authenticated
  with check (follower_id = auth.user_id());
drop policy if exists follows_delete_own on public.follows;
create policy follows_delete_own on public.follows for delete to authenticated using (follower_id = auth.user_id());

-- Comments are visible when their post is visible (posts RLS applies inside the subquery).
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated
  using (
    (status = 'published' or author_id = auth.user_id())
    and exists (select 1 from public.posts p where p.id = post_id)
  );
drop policy if exists comments_insert_own on public.comments;
create policy comments_insert_own on public.comments for insert to authenticated
  with check (
    author_id = auth.user_id() and status = 'published'
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
  );
drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments for delete to authenticated using (author_id = auth.user_id());

grant select, delete on public.likes, public.saves, public.follows, public.comments to authenticated;
grant insert (post_id) on public.likes to authenticated;
grant insert (post_id) on public.saves to authenticated;
grant insert (followee_id) on public.follows to authenticated;
grant insert (post_id, parent_id, body) on public.comments to authenticated;

-- ---------------------------------------------------------------- counter triggers (definer)
create or replace function public.bump_post_counter() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  delta int := case tg_op when 'INSERT' then 1 else -1 end;
  pid uuid := case tg_op when 'INSERT' then new.post_id else old.post_id end;
begin
  if tg_table_name = 'likes' then
    update public.posts set likes_count = greatest(likes_count + delta, 0) where id = pid;
  elsif tg_table_name = 'saves' then
    update public.posts set saves_count = greatest(saves_count + delta, 0) where id = pid;
  elsif tg_table_name = 'comments' then
    update public.posts set comments_count = greatest(comments_count + delta, 0) where id = pid;
  end if;
  return null;
end $$;

drop trigger if exists likes_count_trg on public.likes;
create trigger likes_count_trg after insert or delete on public.likes
  for each row execute function public.bump_post_counter();
drop trigger if exists saves_count_trg on public.saves;
create trigger saves_count_trg after insert or delete on public.saves
  for each row execute function public.bump_post_counter();
drop trigger if exists comments_count_trg on public.comments;
create trigger comments_count_trg after insert or delete on public.comments
  for each row execute function public.bump_post_counter();

create or replace function public.bump_follow_counters() returns trigger
language plpgsql security definer set search_path = public as $$
declare delta int := case tg_op when 'INSERT' then 1 else -1 end;
begin
  update public.profiles set following_count = greatest(following_count + delta, 0)
    where id = case tg_op when 'INSERT' then new.follower_id else old.follower_id end;
  update public.profiles set followers_count = greatest(followers_count + delta, 0)
    where id = case tg_op when 'INSERT' then new.followee_id else old.followee_id end;
  return null;
end $$;

drop trigger if exists follows_count_trg on public.follows;
create trigger follows_count_trg after insert or delete on public.follows
  for each row execute function public.bump_follow_counters();

create or replace function public.bump_profile_posts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.status = 'published' then
    update public.profiles set posts_count = greatest(posts_count - 1, 0) where id = old.author_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.status = 'published' then
    update public.profiles set posts_count = posts_count + 1 where id = new.author_id;
  end if;
  return null;
end $$;

drop trigger if exists posts_profile_count_trg on public.posts;
create trigger posts_profile_count_trg after insert or update of status or delete on public.posts
  for each row execute function public.bump_profile_posts();

-- Backfill for rows created before these triggers existed.
update public.profiles p set posts_count =
  (select count(*) from public.posts x where x.author_id = p.id and x.status = 'published');

-- --------------------------------------------------------------------- feed API v2
drop function if exists public.feed_latest(timestamptz, uuid, uuid, uuid, integer);
drop function if exists public.explore_destination(uuid, uuid, timestamptz, uuid, integer);
drop function if exists public.explore_interest(uuid, uuid, timestamptz, uuid, integer);
drop function if exists public.explore_posts(uuid, uuid, timestamptz, uuid, integer);
drop type if exists public.post_feed_item;

create type public.post_feed_item as (
  id             uuid,
  author_id      text,
  author_name    text,
  title          text,
  body           text,
  rating         smallint,
  price_band     smallint,
  link_url       text,
  likes_count    integer,
  comments_count integer,
  saves_count    integer,
  created_at     timestamptz,
  interest_id    uuid,
  interest_name  text,
  interest_slug  text,
  place_id       uuid,
  place_name     text,
  place_kind     public.place_kind,
  liked_by_me    boolean,
  saved_by_me    boolean
);

create or replace function public.explore_posts(
  p_interest_id       uuid default null,
  p_place_id          uuid default null,
  p_author_id         text default null,
  p_following         boolean default false,
  p_post_id           uuid default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id         uuid default null,
  p_limit             integer default 20
) returns setof public.post_feed_item
language sql stable security invoker set search_path = public as $$
  select p.id, p.author_id, pr.display_name, p.title, p.body, p.rating, p.price_band, p.link_url,
         p.likes_count, p.comments_count, p.saves_count, p.created_at,
         i.id, i.name, i.slug, pl.id, pl.name, pl.kind,
         exists (select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.user_id()),
         exists (select 1 from public.saves s where s.post_id = p.id and s.user_id = auth.user_id())
  from public.posts p
  join public.interests i on i.id = p.interest_id
  left join public.places pl on pl.id = p.place_id
  left join public.profiles pr on pr.id = p.author_id
  where (p.status = 'published' or p.author_id = auth.user_id())
    and (p_post_id is null or p.id = p_post_id)
    and (p_author_id is null or p.author_id = p_author_id)
    and (p_interest_id is null or i.id = p_interest_id or i.parent_id = p_interest_id)
    and (p_place_id is null or pl.id = p_place_id or p_place_id = any (pl.ancestor_ids))
    and (not p_following or p.author_id in (
           select f.followee_id from public.follows f where f.follower_id = auth.user_id()))
    and (p_cursor_created_at is null or (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id))
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

create or replace function public.feed_latest(
  p_cursor_created_at timestamptz default null, p_cursor_id uuid default null,
  p_interest_id uuid default null, p_place_id uuid default null, p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_interest_id => p_interest_id, p_place_id => p_place_id, p_cursor_created_at => p_cursor_created_at,
    p_cursor_id => p_cursor_id, p_limit => p_limit)
$$;

create or replace function public.feed_following(
  p_cursor_created_at timestamptz default null, p_cursor_id uuid default null, p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_following => true, p_cursor_created_at => p_cursor_created_at, p_cursor_id => p_cursor_id, p_limit => p_limit)
$$;

create or replace function public.explore_destination(
  p_place_id uuid, p_interest_id uuid default null,
  p_cursor_created_at timestamptz default null, p_cursor_id uuid default null, p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_interest_id => p_interest_id, p_place_id => p_place_id, p_cursor_created_at => p_cursor_created_at,
    p_cursor_id => p_cursor_id, p_limit => p_limit)
$$;

create or replace function public.explore_interest(
  p_interest_id uuid, p_place_id uuid default null,
  p_cursor_created_at timestamptz default null, p_cursor_id uuid default null, p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_interest_id => p_interest_id, p_place_id => p_place_id, p_cursor_created_at => p_cursor_created_at,
    p_cursor_id => p_cursor_id, p_limit => p_limit)
$$;

-- A user's own posts (profile page) and a single post (detail page), same shape as feeds.
create or replace function public.posts_by_author(
  p_author_id text, p_cursor_created_at timestamptz default null, p_cursor_id uuid default null,
  p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_author_id => p_author_id, p_cursor_created_at => p_cursor_created_at, p_cursor_id => p_cursor_id, p_limit => p_limit)
$$;

create or replace function public.get_post(p_post_id uuid)
returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(p_post_id => p_post_id, p_limit => 1)
$$;

revoke all on function public.explore_posts(uuid, uuid, text, boolean, uuid, timestamptz, uuid, integer) from public;
revoke all on function public.feed_latest(timestamptz, uuid, uuid, uuid, integer) from public;
revoke all on function public.feed_following(timestamptz, uuid, integer) from public;
revoke all on function public.explore_destination(uuid, uuid, timestamptz, uuid, integer) from public;
revoke all on function public.explore_interest(uuid, uuid, timestamptz, uuid, integer) from public;
revoke all on function public.posts_by_author(text, timestamptz, uuid, integer) from public;
revoke all on function public.get_post(uuid) from public;
grant execute on function public.explore_posts(uuid, uuid, text, boolean, uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.feed_latest(timestamptz, uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.feed_following(timestamptz, uuid, integer) to authenticated;
grant execute on function public.explore_destination(uuid, uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.explore_interest(uuid, uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.posts_by_author(text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.get_post(uuid) to authenticated;
