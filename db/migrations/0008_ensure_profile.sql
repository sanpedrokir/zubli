-- Reliable profile creation. Every post/like/comment row references profiles(id), so a signed-in user without a
-- profile row cannot do anything. The browser-side upsert in ProfileSync can fail silently (column grants, timing),
-- so this function creates the CALLER'S OWN profile if it is missing. It can only ever create id = auth.user_id().
--
-- SECURITY DEFINER so it works regardless of table/column grants; the SQL-standard body binds auth.user_id() at
-- creation time (see 0005 for why string-bodied SQL functions fail on the auth schema).
create or replace function public.ensure_profile(
  p_display_name text default null,
  p_avatar_url   text default null
) returns void
language sql security definer set search_path = public
begin atomic
  insert into public.profiles (id, display_name, avatar_url)
  select auth.user_id(),
         nullif(left(btrim(p_display_name), 80), ''),
         case when p_avatar_url ~ '^https://' then left(p_avatar_url, 500) end
  where auth.user_id() is not null
  on conflict (id) do nothing;
end;

revoke all on function public.ensure_profile(text, text) from public;
grant execute on function public.ensure_profile(text, text) to authenticated;
