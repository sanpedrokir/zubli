-- M4: feed + explore RPCs with keyset pagination on (created_at desc, id desc).
-- All functions are SECURITY INVOKER, so posts/places/profiles RLS applies to the caller.
-- Pass the last row's (created_at, id) as the cursor to get the next page; null cursor = first page.
-- Interest filters include child interests (Food includes Coffee); place filters include descendants
-- (Portugal includes Lisbon venues) via places.ancestor_ids. Neither filter is required, and
-- posts without a place are only excluded when a place filter is given.

do $$ begin
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
    place_kind     public.place_kind
  );
exception when duplicate_object then null; end $$;

create or replace function public.explore_posts(
  p_interest_id        uuid default null,
  p_place_id           uuid default null,
  p_cursor_created_at  timestamptz default null,
  p_cursor_id          uuid default null,
  p_limit              integer default 20
) returns setof public.post_feed_item
language sql stable security invoker set search_path = public as $$
  select p.id, p.author_id, pr.display_name, p.title, p.body, p.rating, p.price_band, p.link_url,
         p.likes_count, p.comments_count, p.saves_count, p.created_at,
         i.id, i.name, i.slug, pl.id, pl.name, pl.kind
  from public.posts p
  join public.interests i on i.id = p.interest_id
  left join public.places pl on pl.id = p.place_id
  left join public.profiles pr on pr.id = p.author_id
  where p.status = 'published'
    and (p_interest_id is null or i.id = p_interest_id or i.parent_id = p_interest_id)
    and (p_place_id is null or pl.id = p_place_id or p_place_id = any (pl.ancestor_ids))
    and (p_cursor_created_at is null or (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id))
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;

-- Latest across everything, optionally narrowed.
create or replace function public.feed_latest(
  p_cursor_created_at timestamptz default null,
  p_cursor_id         uuid default null,
  p_interest_id       uuid default null,
  p_place_id          uuid default null,
  p_limit             integer default 20
) returns setof public.post_feed_item
language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(p_interest_id, p_place_id, p_cursor_created_at, p_cursor_id, p_limit)
$$;

-- Destination mode: a place (required) with an optional interest filter.
create or replace function public.explore_destination(
  p_place_id          uuid,
  p_interest_id       uuid default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id         uuid default null,
  p_limit             integer default 20
) returns setof public.post_feed_item
language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(p_interest_id, p_place_id, p_cursor_created_at, p_cursor_id, p_limit)
$$;

-- Interest mode: an interest (required) with an OPTIONAL place filter.
create or replace function public.explore_interest(
  p_interest_id       uuid,
  p_place_id          uuid default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id         uuid default null,
  p_limit             integer default 20
) returns setof public.post_feed_item
language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(p_interest_id, p_place_id, p_cursor_created_at, p_cursor_id, p_limit)
$$;

revoke all on function public.explore_posts(uuid, uuid, timestamptz, uuid, integer) from public;
revoke all on function public.feed_latest(timestamptz, uuid, uuid, uuid, integer) from public;
revoke all on function public.explore_destination(uuid, uuid, timestamptz, uuid, integer) from public;
revoke all on function public.explore_interest(uuid, uuid, timestamptz, uuid, integer) from public;
grant execute on function public.explore_posts(uuid, uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.feed_latest(timestamptz, uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.explore_destination(uuid, uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.explore_interest(uuid, uuid, timestamptz, uuid, integer) to authenticated;
