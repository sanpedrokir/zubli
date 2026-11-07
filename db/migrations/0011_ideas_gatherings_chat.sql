-- Zubli pivot: people (any age) share activity / career ideas, organise small gatherings others can join,
-- and chat in-app (1:1 and per-gathering group chats).
-- The old recommendation tables (posts, places, interests...) are left untouched; the app no longer uses them.
--
-- Conventions (see 0005): functions that call auth.user_id() use SQL-standard bodies (BEGIN ATOMIC) or
-- plpgsql SECURITY DEFINER, so they bind as the owner. RLS on every table, explicit grants to `authenticated`.

-- =========================================================================================== ideas
create table if not exists public.ideas (
  id               uuid primary key default gen_random_uuid(),
  author_id        text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  kind             text not null check (kind in ('activity', 'career')),
  topic            text not null default 'other' check (topic in (
                     'outdoors', 'fitness', 'arts', 'learning', 'volunteering', 'travel', 'food',
                     'social', 'business', 'mentoring', 'tech', 'other')),
  title            text not null check (char_length(btrim(title)) between 1 and 120),
  body             text check (char_length(body) <= 4000),
  cover_url        text check (cover_url ~ '^https://' and char_length(cover_url) <= 500),
  interested_count integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists ideas_created_idx on public.ideas (created_at desc, id desc);
create index if not exists ideas_author_idx on public.ideas (author_id, created_at desc);

-- "I'm interested": lets an idea's author see who to talk to.
create table if not exists public.idea_interests (
  idea_id    uuid not null references public.ideas (id) on delete cascade,
  user_id    text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);
create index if not exists idea_interests_user_idx on public.idea_interests (user_id);

-- ====================================================================================== gatherings
create table if not exists public.gatherings (
  id              uuid primary key default gen_random_uuid(),
  host_id         text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  idea_id         uuid references public.ideas (id) on delete set null,
  topic           text not null default 'other' check (topic in (
                    'outdoors', 'fitness', 'arts', 'learning', 'volunteering', 'travel', 'food',
                    'social', 'business', 'mentoring', 'tech', 'other')),
  title           text not null check (char_length(btrim(title)) between 1 and 120),
  description     text check (char_length(description) <= 4000),
  starts_at       timestamptz not null,
  -- Place is optional: a gathering can be online or "to be agreed in the chat".
  location_text   text check (char_length(location_text) <= 200),
  is_online       boolean not null default false,
  capacity        integer check (capacity between 2 and 500),
  cover_url       text check (cover_url ~ '^https://' and char_length(cover_url) <= 500),
  cancelled       boolean not null default false,
  attendees_count integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists gatherings_starts_idx on public.gatherings (starts_at, id);
create index if not exists gatherings_host_idx on public.gatherings (host_id, starts_at desc);

create table if not exists public.gathering_members (
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  user_id      text not null references public.profiles (id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (gathering_id, user_id)
);
create index if not exists gathering_members_user_idx on public.gathering_members (user_id);

-- =========================================================================================== chat
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('direct', 'gathering')),
  -- 'direct': "<smaller id>|<larger id>" so a pair only ever has one conversation.
  direct_key      text unique,
  gathering_id    uuid unique references public.gatherings (id) on delete cascade,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  check ((kind = 'direct' and direct_key is not null and gathering_id is null)
      or (kind = 'gathering' and gathering_id is not null and direct_key is null))
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         text not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       text not null references public.profiles (id) on delete cascade default (auth.user_id()),
  body            text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at desc, id desc);

-- ===================================================================================== helpers
-- Used inside RLS policies: SECURITY DEFINER so the lookup isn't itself filtered by RLS (no recursion).
create or replace function public.is_conversation_member(p_conversation_id uuid, p_user_id text) returns boolean
language sql stable security definer set search_path = public
begin atomic
  select exists (select 1 from public.conversation_members m
                 where m.conversation_id = p_conversation_id and m.user_id = p_user_id);
end;
revoke all on function public.is_conversation_member(uuid, text) from public;
grant execute on function public.is_conversation_member(uuid, text) to authenticated;

-- ===================================================================================== triggers
create or replace function public.ideas_touch() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists ideas_touch on public.ideas;
create trigger ideas_touch before update on public.ideas for each row execute function public.ideas_touch();

create or replace function public.idea_interests_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.ideas set interested_count = interested_count + 1 where id = new.idea_id;
  else
    update public.ideas set interested_count = greatest(interested_count - 1, 0) where id = old.idea_id;
  end if;
  return null;
end $$;
drop trigger if exists idea_interests_count on public.idea_interests;
create trigger idea_interests_count after insert or delete on public.idea_interests
  for each row execute function public.idea_interests_count();

-- New gathering: the host is its first member and gets a group chat.
create or replace function public.gatherings_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_conversation uuid;
begin
  insert into public.gathering_members (gathering_id, user_id) values (new.id, new.host_id);
  insert into public.conversations (kind, gathering_id) values ('gathering', new.id) returning id into v_conversation;
  insert into public.conversation_members (conversation_id, user_id) values (v_conversation, new.host_id);
  return null;
end $$;
drop trigger if exists gatherings_after_insert on public.gatherings;
create trigger gatherings_after_insert after insert on public.gatherings
  for each row execute function public.gatherings_after_insert();

-- Members <-> attendee count and group-chat membership stay in step.
create or replace function public.gathering_members_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.gatherings set attendees_count = attendees_count + 1 where id = new.gathering_id;
    insert into public.conversation_members (conversation_id, user_id)
      select c.id, new.user_id from public.conversations c where c.gathering_id = new.gathering_id
      on conflict do nothing;
  else
    update public.gatherings set attendees_count = greatest(attendees_count - 1, 0) where id = old.gathering_id;
    delete from public.conversation_members m
      using public.conversations c
      where c.gathering_id = old.gathering_id and m.conversation_id = c.id and m.user_id = old.user_id;
  end if;
  return null;
end $$;
drop trigger if exists gathering_members_sync on public.gathering_members;
create trigger gathering_members_sync after insert or delete on public.gathering_members
  for each row execute function public.gathering_members_sync();

create or replace function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return null;
end $$;
drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.messages_after_insert();

-- ========================================================================================= RLS
alter table public.ideas enable row level security;
alter table public.idea_interests enable row level security;
alter table public.gatherings enable row level security;
alter table public.gathering_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- Ideas and gatherings are public to signed-in members; only the author/host can change them.
drop policy if exists ideas_select on public.ideas;
create policy ideas_select on public.ideas for select to authenticated using (true);
drop policy if exists ideas_insert on public.ideas;
create policy ideas_insert on public.ideas for insert to authenticated with check (author_id = auth.user_id());
drop policy if exists ideas_update on public.ideas;
create policy ideas_update on public.ideas for update to authenticated
  using (author_id = auth.user_id()) with check (author_id = auth.user_id());
drop policy if exists ideas_delete on public.ideas;
create policy ideas_delete on public.ideas for delete to authenticated using (author_id = auth.user_id());

drop policy if exists idea_interests_select on public.idea_interests;
create policy idea_interests_select on public.idea_interests for select to authenticated using (true);
drop policy if exists idea_interests_insert on public.idea_interests;
create policy idea_interests_insert on public.idea_interests for insert to authenticated
  with check (user_id = auth.user_id());
drop policy if exists idea_interests_delete on public.idea_interests;
create policy idea_interests_delete on public.idea_interests for delete to authenticated
  using (user_id = auth.user_id());

drop policy if exists gatherings_select on public.gatherings;
create policy gatherings_select on public.gatherings for select to authenticated using (true);
drop policy if exists gatherings_insert on public.gatherings;
create policy gatherings_insert on public.gatherings for insert to authenticated
  with check (host_id = auth.user_id() and starts_at > now() - interval '1 hour');
drop policy if exists gatherings_update on public.gatherings;
create policy gatherings_update on public.gatherings for update to authenticated
  using (host_id = auth.user_id()) with check (host_id = auth.user_id());
drop policy if exists gatherings_delete on public.gatherings;
create policy gatherings_delete on public.gatherings for delete to authenticated using (host_id = auth.user_id());

-- Who's going is visible to members. Joining goes through join_gathering() (capacity check); leaving is a delete.
drop policy if exists gathering_members_select on public.gathering_members;
create policy gathering_members_select on public.gathering_members for select to authenticated using (true);
drop policy if exists gathering_members_delete on public.gathering_members;
create policy gathering_members_delete on public.gathering_members for delete to authenticated
  using (user_id = auth.user_id()
         and not exists (select 1 from public.gatherings g where g.id = gathering_id and g.host_id = auth.user_id()));

-- Chats: only members see a conversation and its messages; members post as themselves.
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations for select to authenticated
  using (public.is_conversation_member(id, auth.user_id()));

drop policy if exists conversation_members_select on public.conversation_members;
create policy conversation_members_select on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.user_id()));
drop policy if exists conversation_members_update on public.conversation_members;
create policy conversation_members_update on public.conversation_members for update to authenticated
  using (user_id = auth.user_id()) with check (user_id = auth.user_id());

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.user_id()));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.user_id() and public.is_conversation_member(conversation_id, auth.user_id()));

grant select, delete on public.ideas to authenticated;
grant insert (kind, topic, title, body, cover_url) on public.ideas to authenticated;
grant update (kind, topic, title, body, cover_url) on public.ideas to authenticated;
grant select, delete on public.idea_interests to authenticated;
grant insert (idea_id) on public.idea_interests to authenticated;
grant select, delete on public.gatherings to authenticated;
grant insert (idea_id, topic, title, description, starts_at, location_text, is_online, capacity, cover_url)
  on public.gatherings to authenticated;
grant update (topic, title, description, starts_at, location_text, is_online, capacity, cover_url, cancelled)
  on public.gatherings to authenticated;
grant select, delete on public.gathering_members to authenticated;
grant select on public.conversations to authenticated;
grant select on public.conversation_members to authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
grant select on public.messages to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;

-- ========================================================================================= RPCs
-- Ideas feed with author name and whether I'm interested. Keyset pagination on (created_at, id).
create or replace function public.list_ideas(
  p_kind              text default null,
  p_topic             text default null,
  p_author_id         text default null,
  p_idea_id           uuid default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id         uuid default null,
  p_limit             integer default 20
) returns table (
  id uuid, author_id text, author_name text, author_avatar text, kind text, topic text, title text,
  body text, cover_url text, interested_count integer, interested_by_me boolean, created_at timestamptz,
  upcoming_gatherings integer
)
language sql stable security invoker set search_path = public
begin atomic
  select i.id, i.author_id, pr.display_name, pr.avatar_url, i.kind, i.topic, i.title, i.body, i.cover_url,
         i.interested_count,
         exists (select 1 from public.idea_interests x where x.idea_id = i.id and x.user_id = auth.user_id()),
         i.created_at,
         (select count(*) from public.gatherings g
           where g.idea_id = i.id and not g.cancelled and g.starts_at > now())::integer
  from public.ideas i
  left join public.profiles pr on pr.id = i.author_id
  where (p_kind is null or i.kind = p_kind)
    and (p_topic is null or i.topic = p_topic)
    and (p_author_id is null or i.author_id = p_author_id)
    and (p_idea_id is null or i.id = p_idea_id)
    and (p_cursor_created_at is null or (i.created_at, i.id) < (p_cursor_created_at, p_cursor_id))
  order by i.created_at desc, i.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
end;

-- Gatherings: p_when = 'upcoming' (default, soonest first) | 'past' (most recent first) | 'all'.
-- p_mine = true limits to gatherings I host or joined.
create or replace function public.list_gatherings(
  p_when         text default 'upcoming',
  p_topic        text default null,
  p_idea_id      uuid default null,
  p_gathering_id uuid default null,
  p_mine         boolean default false,
  p_limit        integer default 50
) returns table (
  id uuid, host_id text, host_name text, host_avatar text, idea_id uuid, idea_title text, topic text,
  title text, description text, starts_at timestamptz, location_text text, is_online boolean,
  capacity integer, cover_url text, cancelled boolean, attendees_count integer, joined_by_me boolean,
  conversation_id uuid
)
language sql stable security invoker set search_path = public
begin atomic
  select g.id, g.host_id, pr.display_name, pr.avatar_url, g.idea_id, i.title, g.topic, g.title, g.description,
         g.starts_at, g.location_text, g.is_online, g.capacity, g.cover_url, g.cancelled, g.attendees_count,
         exists (select 1 from public.gathering_members m where m.gathering_id = g.id and m.user_id = auth.user_id()),
         -- Only members can see (and open) the group chat.
         (select c.id from public.conversations c where c.gathering_id = g.id)
  from public.gatherings g
  left join public.profiles pr on pr.id = g.host_id
  left join public.ideas i on i.id = g.idea_id
  where (p_gathering_id is null or g.id = p_gathering_id)
    and (p_topic is null or g.topic = p_topic)
    and (p_idea_id is null or g.idea_id = p_idea_id)
    and (not p_mine or exists (select 1 from public.gathering_members m
                               where m.gathering_id = g.id and m.user_id = auth.user_id()))
    and (p_gathering_id is not null
         or case p_when
              when 'upcoming' then g.starts_at > now() - interval '3 hours' and not g.cancelled
              when 'past' then g.starts_at <= now() - interval '3 hours'
              else true
            end)
  order by case when p_when = 'past' then null else g.starts_at end asc,
           case when p_when = 'past' then g.starts_at end desc,
           g.id
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
end;

-- Who's going (host first).
create or replace function public.gathering_attendees(p_gathering_id uuid)
returns table (user_id text, display_name text, avatar_url text, is_host boolean, joined_at timestamptz)
language sql stable security invoker set search_path = public
begin atomic
  select m.user_id, pr.display_name, pr.avatar_url, m.user_id = g.host_id, m.joined_at
  from public.gathering_members m
  join public.gatherings g on g.id = m.gathering_id
  left join public.profiles pr on pr.id = m.user_id
  where m.gathering_id = p_gathering_id
  order by (m.user_id = g.host_id) desc, m.joined_at;
end;

-- Who said "I'm interested" in an idea.
create or replace function public.idea_interested_people(p_idea_id uuid)
returns table (user_id text, display_name text, avatar_url text, created_at timestamptz)
language sql stable security invoker set search_path = public
begin atomic
  select x.user_id, pr.display_name, pr.avatar_url, x.created_at
  from public.idea_interests x
  left join public.profiles pr on pr.id = x.user_id
  where x.idea_id = p_idea_id
  order by x.created_at desc
  limit 100;
end;

-- Join with a capacity check. Locks the gathering row so two last-spot joins can't both succeed.
create or replace function public.join_gathering(p_gathering_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me text := auth.user_id();
  g public.gatherings%rowtype;
begin
  if v_me is null then raise exception 'Please sign in first.'; end if;
  select * into g from public.gatherings where id = p_gathering_id for update;
  if not found then raise exception 'That gathering no longer exists.'; end if;
  if g.cancelled then raise exception 'This gathering was cancelled.'; end if;
  if g.starts_at < now() - interval '3 hours' then raise exception 'This gathering has already happened.'; end if;
  if exists (select 1 from public.gathering_members where gathering_id = g.id and user_id = v_me) then return; end if;
  if g.capacity is not null and g.attendees_count >= g.capacity then raise exception 'Sorry, this gathering is full.'; end if;
  insert into public.gathering_members (gathering_id, user_id) values (g.id, v_me);
end $$;

-- Open (or create) my 1:1 chat with someone. Returns the conversation id.
create or replace function public.start_direct_chat(p_other_id text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me text := auth.user_id();
  v_key text;
  v_id uuid;
begin
  if v_me is null then raise exception 'Please sign in first.'; end if;
  if p_other_id is null or p_other_id = v_me then raise exception 'Pick someone else to chat with.'; end if;
  if not exists (select 1 from public.profiles where id = p_other_id) then raise exception 'That person was not found.'; end if;
  v_key := least(v_me, p_other_id) || '|' || greatest(v_me, p_other_id);
  insert into public.conversations (kind, direct_key) values ('direct', v_key)
    on conflict (direct_key) do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from public.conversations where direct_key = v_key;
  end if;
  insert into public.conversation_members (conversation_id, user_id)
    values (v_id, v_me), (v_id, p_other_id) on conflict do nothing;
  return v_id;
end $$;

-- My chats, newest activity first, with a title, the last message and how many I haven't read.
create or replace function public.my_conversations()
returns table (
  id uuid, kind text, title text, avatar_url text, other_id text, gathering_id uuid,
  last_message text, last_sender_name text, last_message_at timestamptz, unread_count integer
)
language sql stable security invoker set search_path = public
begin atomic
  select c.id, c.kind,
         case when c.kind = 'gathering' then g.title else coalesce(op.display_name, 'Zubli member') end,
         case when c.kind = 'gathering' then g.cover_url else op.avatar_url end,
         om.user_id,
         c.gathering_id,
         lm.body, lp.display_name, c.last_message_at,
         (select count(*) from public.messages x
           where x.conversation_id = c.id and x.created_at > me.last_read_at and x.sender_id <> auth.user_id())::integer
  from public.conversation_members me
  join public.conversations c on c.id = me.conversation_id
  left join public.gatherings g on g.id = c.gathering_id
  left join lateral (select m.user_id from public.conversation_members m
                     where c.kind = 'direct' and m.conversation_id = c.id and m.user_id <> auth.user_id()
                     limit 1) om on true
  left join public.profiles op on op.id = om.user_id
  left join lateral (select x.body, x.sender_id from public.messages x
                     where x.conversation_id = c.id order by x.created_at desc, x.id desc limit 1) lm on true
  left join public.profiles lp on lp.id = lm.sender_id
  where me.user_id = auth.user_id()
    -- Hide empty 1:1 chats the other person started but never wrote in.
    and (c.kind = 'gathering' or lm.body is not null or exists (
           select 1 from public.conversation_members m2 where m2.conversation_id = c.id and m2.user_id = auth.user_id()))
  order by c.last_message_at desc
  limit 100;
end;

-- One conversation's header (only if I'm a member).
create or replace function public.get_conversation(p_conversation_id uuid)
returns table (id uuid, kind text, title text, avatar_url text, other_id text, gathering_id uuid, member_count integer)
language sql stable security invoker set search_path = public
begin atomic
  select c.id, c.kind,
         case when c.kind = 'gathering' then g.title else coalesce(op.display_name, 'Zubli member') end,
         case when c.kind = 'gathering' then g.cover_url else op.avatar_url end,
         om.user_id, c.gathering_id,
         (select count(*) from public.conversation_members m where m.conversation_id = c.id)::integer
  from public.conversations c
  left join public.gatherings g on g.id = c.gathering_id
  left join lateral (select m.user_id from public.conversation_members m
                     where c.kind = 'direct' and m.conversation_id = c.id and m.user_id <> auth.user_id()
                     limit 1) om on true
  left join public.profiles op on op.id = om.user_id
  where c.id = p_conversation_id;
end;

-- Messages, newest first (the client reverses). p_after = only newer than this (polling).
create or replace function public.conversation_messages(
  p_conversation_id uuid,
  p_before          timestamptz default null,
  p_after           timestamptz default null,
  p_limit           integer default 50
) returns table (id uuid, sender_id text, sender_name text, sender_avatar text, body text, created_at timestamptz)
language sql stable security invoker set search_path = public
begin atomic
  select m.id, m.sender_id, pr.display_name, pr.avatar_url, m.body, m.created_at
  from public.messages m
  left join public.profiles pr on pr.id = m.sender_id
  where m.conversation_id = p_conversation_id
    and (p_before is null or m.created_at < p_before)
    and (p_after is null or m.created_at > p_after)
  order by m.created_at desc, m.id desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;

create or replace function public.mark_conversation_read(p_conversation_id uuid) returns void
language sql security invoker set search_path = public
begin atomic
  update public.conversation_members set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.user_id();
end;

-- Total unread across all my chats (nav badge).
create or replace function public.my_unread_count() returns integer
language sql stable security invoker set search_path = public
begin atomic
  select count(*)::integer
  from public.conversation_members me
  join public.messages x on x.conversation_id = me.conversation_id
  where me.user_id = auth.user_id() and x.created_at > me.last_read_at and x.sender_id <> auth.user_id();
end;

revoke all on function public.list_ideas(text, text, text, uuid, timestamptz, uuid, integer) from public;
revoke all on function public.list_gatherings(text, text, uuid, uuid, boolean, integer) from public;
revoke all on function public.gathering_attendees(uuid) from public;
revoke all on function public.idea_interested_people(uuid) from public;
revoke all on function public.join_gathering(uuid) from public;
revoke all on function public.start_direct_chat(text) from public;
revoke all on function public.my_conversations() from public;
revoke all on function public.get_conversation(uuid) from public;
revoke all on function public.conversation_messages(uuid, timestamptz, timestamptz, integer) from public;
revoke all on function public.mark_conversation_read(uuid) from public;
revoke all on function public.my_unread_count() from public;

grant execute on function public.list_ideas(text, text, text, uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.list_gatherings(text, text, uuid, uuid, boolean, integer) to authenticated;
grant execute on function public.gathering_attendees(uuid) to authenticated;
grant execute on function public.idea_interested_people(uuid) to authenticated;
grant execute on function public.join_gathering(uuid) to authenticated;
grant execute on function public.start_direct_chat(text) to authenticated;
grant execute on function public.my_conversations() to authenticated;
grant execute on function public.get_conversation(uuid) to authenticated;
grant execute on function public.conversation_messages(uuid, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
grant execute on function public.my_unread_count() to authenticated;
