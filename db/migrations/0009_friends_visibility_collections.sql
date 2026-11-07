-- Friends-first model: per-item visibility (private / friends / public), friendships, and collections.
-- Existing posts become PUBLIC so the current public feeds keep working. New posts default to 'friends'.

-- ------------------------------------------------------------------- post visibility + "where to find it"
do $$ begin
  create type public.post_visibility as enum ('private', 'friends', 'public');
exception when duplicate_object then null; end $$;

alter table public.posts
  add column if not exists visibility public.post_visibility not null default 'friends',
  add column if not exists where_text text check (char_length(where_text) <= 200);

-- Backfill only the rows that existed before this migration (everything so far was public).
update public.posts set visibility = 'public' where created_at < now() - interval '1 second';

grant insert (visibility, where_text) on public.posts to authenticated;
grant update (visibility, where_text) on public.posts to authenticated;

-- ------------------------------------------------------------------------------------- friendships
do $$ begin
  create type public.friendship_status as enum ('pending', 'accepted');
exception when duplicate_object then null; end $$;

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  addressee_id text not null references public.profiles (id) on delete cascade,
  status       public.friendship_status not null default 'pending',
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> addressee_id)
);
-- One friendship per pair, whichever way round it was requested.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

create or replace function public.friendships_touch() returns trigger
language plpgsql as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then new.responded_at := now(); end if;
  return new;
end $$;
drop trigger if exists friendships_touch on public.friendships;
create trigger friendships_touch before update on public.friendships
  for each row execute function public.friendships_touch();

alter table public.friendships enable row level security;
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships for select to authenticated
  using (requester_id = auth.user_id() or addressee_id = auth.user_id());
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships for insert to authenticated
  with check (requester_id = auth.user_id() and status = 'pending');
-- Only the person who RECEIVED the request can accept it.
drop policy if exists friendships_accept on public.friendships;
create policy friendships_accept on public.friendships for update to authenticated
  using (addressee_id = auth.user_id() and status = 'pending')
  with check (addressee_id = auth.user_id() and status = 'accepted');
-- Either person can decline, cancel or unfriend.
drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete to authenticated
  using (requester_id = auth.user_id() or addressee_id = auth.user_id());

grant select, delete on public.friendships to authenticated;
grant insert (addressee_id) on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;

-- Used inside RLS policies. SECURITY DEFINER so the lookup itself isn't filtered by friendships RLS (which would
-- make policies recurse). SQL-standard body: bound at creation, see 0005.
create or replace function public.are_friends(a text, b text) returns boolean
language sql stable security definer set search_path = public
begin atomic
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a)));
end;
revoke all on function public.are_friends(text, text) from public;
grant execute on function public.are_friends(text, text) to authenticated, anonymous;

-- ------------------------------------------------------------------------ posts: who may read what
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated
  using (
    author_id = auth.user_id()
    or (status = 'published' and (
          visibility = 'public'
          or (visibility = 'friends' and public.are_friends(author_id, auth.user_id()))))
  );
drop policy if exists posts_select_anon on public.posts;
create policy posts_select_anon on public.posts for select to anonymous
  using (status = 'published' and visibility = 'public');

-- ------------------------------------------------------------------------------------ collections
create table if not exists public.collections (
  id         uuid primary key default gen_random_uuid(),
  owner_id   text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now()
);
create index if not exists collections_owner_idx on public.collections (owner_id, created_at desc);

create table if not exists public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  post_id       uuid not null references public.posts (id) on delete cascade,
  added_at      timestamptz not null default now(),
  primary key (collection_id, post_id)
);
create index if not exists collection_items_post_idx on public.collection_items (post_id);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

-- You see your own collections and your friends' collections. What's INSIDE is still filtered by each item's visibility.
drop policy if exists collections_select on public.collections;
create policy collections_select on public.collections for select to authenticated
  using (owner_id = auth.user_id() or public.are_friends(owner_id, auth.user_id()));
drop policy if exists collections_insert on public.collections;
create policy collections_insert on public.collections for insert to authenticated
  with check (owner_id = auth.user_id());
drop policy if exists collections_update on public.collections;
create policy collections_update on public.collections for update to authenticated
  using (owner_id = auth.user_id()) with check (owner_id = auth.user_id());
drop policy if exists collections_delete on public.collections;
create policy collections_delete on public.collections for delete to authenticated
  using (owner_id = auth.user_id());

drop policy if exists collection_items_select on public.collection_items;
create policy collection_items_select on public.collection_items for select to authenticated
  using (
    exists (select 1 from public.collections c where c.id = collection_id)
    and exists (select 1 from public.posts p where p.id = post_id));
-- Add/remove only in your own collection, and only posts you are allowed to see (yours, a friend's, a public one).
drop policy if exists collection_items_insert on public.collection_items;
create policy collection_items_insert on public.collection_items for insert to authenticated
  with check (
    exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.user_id())
    and exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists collection_items_delete on public.collection_items;
create policy collection_items_delete on public.collection_items for delete to authenticated
  using (exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = auth.user_id()));

grant select, delete on public.collections, public.collection_items to authenticated;
grant insert (name) on public.collections to authenticated;
grant update (name) on public.collections to authenticated;
grant insert (collection_id, post_id) on public.collection_items to authenticated;
