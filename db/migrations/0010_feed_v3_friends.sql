-- Feed API v3: scopes (public / friends / mine / all), collections, and friend helpers.
-- Result type gains visibility + where_text, so the function set is dropped and recreated (cascade drops dependents).
-- Same naming as before; old callers keep working (feed_latest etc. are the PUBLIC feeds, feed_following = friends).
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
  cover_url      text,
  visibility     public.post_visibility,
  where_text     text
);

-- p_scope: 'public'  = public items only (discovery)
--          'friends' = items by my accepted friends that they shared with friends or publicly
--          'mine'    = everything I posted, including private items (my notebook)
--          'all'     = whatever row-level security lets me see (profile pages, one post, collections)
-- SQL-standard body (BEGIN ATOMIC): bound at CREATE time so auth.user_id() works for `authenticated` (see 0005).
create or replace function public.explore_posts(
  p_interest_id       uuid default null,
  p_place_id          uuid default null,
  p_author_id         text default null,
  p_scope             text default 'public',
  p_post_id           uuid default null,
  p_collection_id     uuid default null,
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
         (select m.storage_path from public.post_media m where m.post_id = p.id order by m.position limit 1),
         p.visibility, p.where_text
  from public.posts p
  join public.interests i on i.id = p.interest_id
  left join public.places pl on pl.id = p.place_id
  left join public.profiles pr on pr.id = p.author_id
  where (p.status = 'published' or p.author_id = auth.user_id())
    and (p_post_id is null or p.id = p_post_id)
    and (p_author_id is null or p.author_id = p_author_id)
    and (p_interest_id is null or i.id = p_interest_id or i.parent_id = p_interest_id)
    and (p_place_id is null or pl.id = p_place_id or p_place_id = any (pl.ancestor_ids))
    and (p_collection_id is null or exists (
           select 1 from public.collection_items ci where ci.collection_id = p_collection_id and ci.post_id = p.id))
    and case p_scope
          when 'public'  then p.visibility = 'public'
          when 'friends' then p.author_id <> auth.user_id()
                              and p.visibility in ('friends', 'public')
                              and public.are_friends(p.author_id, auth.user_id())
          when 'mine'    then p.author_id = auth.user_id()
          else true
        end
    and (p_cursor_created_at is null or (p.created_at, p.id) < (p_cursor_created_at, p_cursor_id))
  order by p.created_at desc, p.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;

-- Public discovery feeds (unchanged names).
create or replace function public.feed_latest(
  p_cursor_created_at timestamptz default null, p_cursor_id uuid default null,
  p_interest_id uuid default null, p_place_id uuid default null, p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_interest_id => p_interest_id, p_place_id => p_place_id, p_cursor_created_at => p_cursor_created_at,
    p_cursor_id => p_cursor_id, p_limit => p_limit)
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

-- Friends feed (feed_following kept as an alias so the live app's old "Following" tab now shows friends).
create or replace function public.feed_friends(
  p_cursor_created_at timestamptz default null, p_cursor_id uuid default null,
  p_interest_id uuid default null, p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_interest_id => p_interest_id, p_scope => 'friends', p_cursor_created_at => p_cursor_created_at,
    p_cursor_id => p_cursor_id, p_limit => p_limit)
$$;

create or replace function public.feed_following(
  p_cursor_created_at timestamptz default null, p_cursor_id uuid default null, p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_scope => 'friends', p_cursor_created_at => p_cursor_created_at, p_cursor_id => p_cursor_id, p_limit => p_limit)
$$;

-- My notebook: everything I posted, private items included.
create or replace function public.my_notebook(
  p_cursor_created_at timestamptz default null, p_cursor_id uuid default null,
  p_interest_id uuid default null, p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_interest_id => p_interest_id, p_scope => 'mine', p_cursor_created_at => p_cursor_created_at,
    p_cursor_id => p_cursor_id, p_limit => p_limit)
$$;

-- Someone's posts as I am allowed to see them (my own profile shows everything; a friend's shows friends+public).
create or replace function public.posts_by_author(
  p_author_id text, p_cursor_created_at timestamptz default null, p_cursor_id uuid default null,
  p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_author_id => p_author_id, p_scope => 'all', p_cursor_created_at => p_cursor_created_at,
    p_cursor_id => p_cursor_id, p_limit => p_limit)
$$;

-- Items inside one collection, limited to what I may see.
create or replace function public.collection_posts(
  p_collection_id uuid, p_cursor_created_at timestamptz default null, p_cursor_id uuid default null,
  p_limit integer default 20
) returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(
    p_collection_id => p_collection_id, p_scope => 'all', p_cursor_created_at => p_cursor_created_at,
    p_cursor_id => p_cursor_id, p_limit => p_limit)
$$;

create or replace function public.get_post(p_post_id uuid)
returns setof public.post_feed_item language sql stable security invoker set search_path = public as $$
  select * from public.explore_posts(p_post_id => p_post_id, p_scope => 'all', p_limit => 1)
$$;

-- ------------------------------------------------------------------------------------ friends
-- My friendships and requests, with the other person's name. direction: 'incoming' (they asked me) / 'outgoing'.
create or replace function public.my_friendships()
returns table (friendship_id uuid, other_id text, other_name text, other_avatar text,
               status public.friendship_status, direction text, created_at timestamptz)
language sql stable security invoker set search_path = public
begin atomic
  select f.id,
         case when f.requester_id = auth.user_id() then f.addressee_id else f.requester_id end,
         pr.display_name, pr.avatar_url, f.status,
         case when f.requester_id = auth.user_id() then 'outgoing' else 'incoming' end,
         f.created_at
  from public.friendships f
  join public.profiles pr
    on pr.id = case when f.requester_id = auth.user_id() then f.addressee_id else f.requester_id end
  where f.requester_id = auth.user_id() or f.addressee_id = auth.user_id()
  order by f.created_at desc;
end;

-- Find people by name (min 2 characters), with how they relate to me: none / friends / incoming / outgoing.
create or replace function public.search_people(p_query text)
returns table (id text, display_name text, avatar_url text, relation text)
language sql stable security invoker set search_path = public
begin atomic
  select pr.id, pr.display_name, pr.avatar_url,
         coalesce((select case when f.status = 'accepted' then 'friends'
                               when f.requester_id = auth.user_id() then 'outgoing'
                               else 'incoming' end
                   from public.friendships f
                   where (f.requester_id = pr.id and f.addressee_id = auth.user_id())
                      or (f.addressee_id = pr.id and f.requester_id = auth.user_id())
                   limit 1), 'none')
  from public.profiles pr
  where pr.id <> auth.user_id()
    and char_length(btrim(p_query)) >= 2
    and pr.display_name ilike '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by pr.display_name
  limit 20;
end;

-- Collections I can see (mine first, then my friends'), with how many items I can see inside and a cover photo.
create or replace function public.collections_visible()
returns table (id uuid, name text, owner_id text, owner_name text, item_count integer,
               cover_url text, mine boolean, created_at timestamptz)
language sql stable security invoker set search_path = public
begin atomic
  select c.id, c.name, c.owner_id, pr.display_name,
         (select count(*) from public.collection_items ci join public.posts p on p.id = ci.post_id
           where ci.collection_id = c.id)::integer,
         (select m.storage_path from public.collection_items ci
            join public.posts p on p.id = ci.post_id
            join public.post_media m on m.post_id = p.id
           where ci.collection_id = c.id order by ci.added_at desc, m.position limit 1),
         c.owner_id = auth.user_id(),
         c.created_at
  from public.collections c
  join public.profiles pr on pr.id = c.owner_id
  order by (c.owner_id = auth.user_id()) desc, c.created_at desc;
end;

-- ------------------------------------------------------------------------------------ grants
revoke all on function public.explore_posts(uuid, uuid, text, text, uuid, uuid, timestamptz, uuid, integer) from public;
revoke all on function public.feed_latest(timestamptz, uuid, uuid, uuid, integer) from public;
revoke all on function public.explore_destination(uuid, uuid, timestamptz, uuid, integer) from public;
revoke all on function public.explore_interest(uuid, uuid, timestamptz, uuid, integer) from public;
revoke all on function public.feed_friends(timestamptz, uuid, uuid, integer) from public;
revoke all on function public.feed_following(timestamptz, uuid, integer) from public;
revoke all on function public.my_notebook(timestamptz, uuid, uuid, integer) from public;
revoke all on function public.posts_by_author(text, timestamptz, uuid, integer) from public;
revoke all on function public.collection_posts(uuid, timestamptz, uuid, integer) from public;
revoke all on function public.get_post(uuid) from public;
revoke all on function public.my_friendships() from public;
revoke all on function public.search_people(text) from public;
revoke all on function public.collections_visible() from public;

grant execute on function public.explore_posts(uuid, uuid, text, text, uuid, uuid, timestamptz, uuid, integer) to authenticated, anonymous;
grant execute on function public.feed_latest(timestamptz, uuid, uuid, uuid, integer) to authenticated, anonymous;
grant execute on function public.explore_destination(uuid, uuid, timestamptz, uuid, integer) to authenticated, anonymous;
grant execute on function public.explore_interest(uuid, uuid, timestamptz, uuid, integer) to authenticated, anonymous;
grant execute on function public.posts_by_author(text, timestamptz, uuid, integer) to authenticated, anonymous;
grant execute on function public.get_post(uuid) to authenticated, anonymous;
grant execute on function public.feed_friends(timestamptz, uuid, uuid, integer) to authenticated;
grant execute on function public.feed_following(timestamptz, uuid, integer) to authenticated;
grant execute on function public.my_notebook(timestamptz, uuid, uuid, integer) to authenticated;
grant execute on function public.collection_posts(uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.my_friendships() to authenticated;
grant execute on function public.search_people(text) to authenticated;
grant execute on function public.collections_visible() to authenticated;
