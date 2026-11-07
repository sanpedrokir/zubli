-- M3 photos: expose each post's cover image (first post_media row) in every feed/detail RPC.
-- post_media.storage_path now holds the public Vercel Blob URL of the uploaded image.
-- The result type changes, so the function set is dropped and recreated (names/args unchanged).
drop type if exists public.post_feed_item cascade;

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
  saved_by_me    boolean,
  cover_url      text
);

-- SQL-standard body (BEGIN ATOMIC): bound at CREATE time so auth.user_id() works for `authenticated`
-- (see 0005 for why string-bodied SQL functions fail on the auth schema).
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
language sql stable security invoker set search_path = public
begin atomic
  select p.id, p.author_id, pr.display_name, p.title, p.body, p.rating, p.price_band, p.link_url,
         p.likes_count, p.comments_count, p.saves_count, p.created_at,
         i.id, i.name, i.slug, pl.id, pl.name, pl.kind,
         exists (select 1 from public.likes l where l.post_id = p.id and l.user_id = auth.user_id()),
         exists (select 1 from public.saves s where s.post_id = p.id and s.user_id = auth.user_id()),
         (select m.storage_path from public.post_media m where m.post_id = p.id order by m.position limit 1)
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
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;

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

-- post_media: only Vercel Blob public URLs, and at most 6 photos per post.
alter table public.post_media drop constraint if exists post_media_url_chk;
alter table public.post_media add constraint post_media_url_chk
  check (storage_path ~ '^https://[A-Za-z0-9.-]+\.public\.blob\.vercel-storage\.com/');
alter table public.post_media drop constraint if exists post_media_position_chk;
alter table public.post_media add constraint post_media_position_chk check (position between 0 and 5);
