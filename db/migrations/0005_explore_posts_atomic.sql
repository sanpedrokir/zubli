-- Fix for 0004: `authenticated` has no USAGE on schema `auth` (only EXECUTE on auth.user_id()).
-- String-bodied SQL functions are re-parsed at call time as the caller, so `auth.user_id()` failed with
-- "permission denied for schema auth". A SQL-standard body (BEGIN ATOMIC) is parsed and bound at CREATE
-- time as the owner, exactly like RLS policies and column defaults. Same signature and result type.
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
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;
