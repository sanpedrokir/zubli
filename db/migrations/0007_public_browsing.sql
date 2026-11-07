-- Public browsing: signed-out visitors (Neon Data API role `anonymous`) can READ published content.
-- Writing, liking, saving, following and commenting still require sign-in (no anonymous write grants).
-- Also fixes a leak from 0001: every signed-in user could read every profile's email.

-- ----------------------------------------------------------------- profiles: hide email
revoke select on public.profiles from authenticated;
grant select (id, display_name, avatar_url, followers_count, following_count, posts_count, created_at)
  on public.profiles to authenticated, anonymous;
drop policy if exists profiles_select_anon on public.profiles;
create policy profiles_select_anon on public.profiles for select to anonymous using (true);

-- ------------------------------------------------------------------ read-only content
grant select on public.interests, public.places, public.posts, public.post_media, public.comments to anonymous;

drop policy if exists interests_select_anon on public.interests;
create policy interests_select_anon on public.interests for select to anonymous using (is_active);

drop policy if exists places_select_anon on public.places;
create policy places_select_anon on public.places for select to anonymous using (true);

drop policy if exists posts_select_anon on public.posts;
create policy posts_select_anon on public.posts for select to anonymous using (status = 'published');

drop policy if exists post_media_select_anon on public.post_media;
create policy post_media_select_anon on public.post_media for select to anonymous
  using (exists (select 1 from public.posts p where p.id = post_id));

drop policy if exists comments_select_anon on public.comments;
create policy comments_select_anon on public.comments for select to anonymous
  using (status = 'published' and exists (select 1 from public.posts p where p.id = post_id));

-- The feed functions look at likes/saves/follows to compute "liked by me". Anonymous needs the table
-- privilege for the query to run, but has NO policy on these tables, so it always sees zero rows.
grant select on public.likes, public.saves, public.follows to anonymous;

-- ----------------------------------------------------------------------- RPC access
grant execute on function public.explore_posts(uuid, uuid, text, boolean, uuid, timestamptz, uuid, integer) to anonymous;
grant execute on function public.feed_latest(timestamptz, uuid, uuid, uuid, integer) to anonymous;
grant execute on function public.feed_following(timestamptz, uuid, integer) to anonymous;
grant execute on function public.explore_destination(uuid, uuid, timestamptz, uuid, integer) to anonymous;
grant execute on function public.explore_interest(uuid, uuid, timestamptz, uuid, integer) to anonymous;
grant execute on function public.posts_by_author(text, timestamptz, uuid, integer) to anonymous;
grant execute on function public.get_post(uuid) to anonymous;
