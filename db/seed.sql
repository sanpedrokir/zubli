-- Seed data. Safe to re-run. Run with DATABASE_URL after 0002_core_schema.sql.
insert into public.interests (slug, name, icon, color, sort_order) values
  ('travel',       'Travel',       'plane',     'violet',    10),
  ('food',         'Food',         'utensils',  'coral',     20),
  ('drinks',       'Drinks',       'wine',      'coral',     30),
  ('shopping',     'Shopping',     'bag',       'yellow',    40),
  ('tech',         'Tech',         'cpu',       'turquoise', 50),
  ('footwear',     'Footwear',     'shoe',      'violet',    60),
  ('hobbies',      'Hobbies',      'palette',   'yellow',    70),
  ('collectibles', 'Collectibles', 'gem',       'violet',    80),
  ('other',        'Anything else','sparkles',  'navy',      999)
on conflict (slug) do nothing;

insert into public.interests (parent_id, slug, name, sort_order)
select i.id, c.slug, c.name, c.sort_order
from (values
  ('food',         'street-food', 'Street food', 1),
  ('food',         'coffee',      'Coffee',      2),
  ('footwear',     'sneakers',    'Sneakers',    1),
  ('collectibles', 'vinyl',       'Vinyl records', 1),
  ('collectibles', 'trading-cards','Trading cards', 2)
) as c(parent_slug, slug, name, sort_order)
join public.interests i on i.slug = c.parent_slug
on conflict (slug) do nothing;

-- A few starter places (verified). Hierarchy: country > city.
insert into public.places (kind, name, slug, country_code, verified)
select 'country', v.name, v.slug, v.cc, true
from (values ('Portugal','portugal','PT'), ('Japan','japan','JP'), ('Mexico','mexico','MX')) as v(name, slug, cc)
where not exists (select 1 from public.places p where p.parent_id is null and p.slug = v.slug);

insert into public.places (parent_id, kind, name, slug, country_code, lat, lng, verified)
select c.id, 'city', v.name, v.slug, c.country_code, v.lat, v.lng, true
from (values
  ('portugal','Lisbon','lisbon', 38.7223, -9.1393),
  ('portugal','Porto','porto', 41.1579, -8.6291),
  ('japan','Tokyo','tokyo', 35.6762, 139.6503),
  ('mexico','Mexico City','mexico-city', 19.4326, -99.1332)
) as v(country_slug, name, slug, lat, lng)
join public.places c on c.parent_id is null and c.slug = v.country_slug
where not exists (select 1 from public.places p where p.parent_id = c.id and p.slug = v.slug);
