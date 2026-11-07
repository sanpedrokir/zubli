// Demo content for development: fictitious users, ~20 posts with real photos, and believable activity.
//
//   npm run db:demo          create (or re-create) the demo data
//   npm run db:demo:remove   delete everything this script created
//
// Needs DATABASE_URL (.env.local) plus Vercel Blob credentials for uploads:
//   vercel env pull .env.blob --environment=production --cwd services/upload --yes
// then it runs with both env files (see package.json). Photos come from Wikimedia Commons (CC0 / CC BY /
// CC BY-SA only); credits are written to docs/demo-credits.md and into each photo's alt text.
// Everything is tagged by user id prefix `demo_`, so it is easy to find and delete. Never run against a
// database with real users you care about without checking the delete scope first (only `demo_%` rows).
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import pg from "pg";

const REMOVE = process.argv.includes("--remove");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (.env.local).");

// ------------------------------------------------------------------------------------------ people
const PEOPLE = [
  ["mia", "Mia Tanaka"], ["leo", "Leo Marsh"], ["priya", "Priya Nair"], ["diego", "Diego Alvarez"],
  ["hana", "Hana Kim"], ["tom", "Tom Becker"], ["sofia", "Sofia Rossi"], ["amara", "Amara Okafor"],
  ["noah", "Noah Bennett"], ["yuki", "Yuki Sato"], ["chloe", "Chloe Dubois"], ["sam", "Sam Rivera"],
];

// Extra places needed beyond db/seed.sql: [country name, slug, code, city name, city slug, lat, lng]
const EXTRA_PLACES = [
  ["Japan", "japan", "JP", "Kyoto", "kyoto", 35.0116, 135.7681],
  ["Japan", "japan", "JP", "Osaka", "osaka", 34.6937, 135.5023],
  ["South Korea", "south-korea", "KR", "Seoul", "seoul", 37.5665, 126.978],
  ["United Kingdom", "united-kingdom", "GB", "London", "london", 51.5074, -0.1278],
];

// ------------------------------------------------------------------------------------------- posts
// hoursAgo: newest first. place: city slug or null (location is optional!). search: Wikimedia Commons query.
const POSTS = [
  { who: "mia", interest: "travel", place: "tokyo", hoursAgo: 1, rating: 5, price: 2, search: "Chureito Pagoda Mount Fuji",
    title: "A Perfect 3-Day Tokyo Itinerary", body: "Day 1 Asakusa and the river, day 2 Shibuya and Harajuku, day 3 a day trip to Fuji. Get a Suica card at the airport and walk more than you plan to." },
  { who: "leo", interest: "sneakers", place: null, hoursAgo: 3, rating: 4, price: 3, search: "sneakers shoes",
    title: "Best Sneakers This Year", body: "Comfortable out of the box, great on cobblestones, and they go with everything. Sizing runs half a size small, so go up." },
  { who: "chloe", interest: "coffee", place: "osaka", hoursAgo: 6, rating: 5, price: 2, search: "latte art coffee",
    title: "Hidden Cafés in Osaka", body: "Tiny place two floors up, no sign, seven seats. The flat white is the best I've had in Japan. Go before 10am." },
  { who: "yuki", interest: "travel", place: "kyoto", hoursAgo: 9, rating: 5, price: 1, search: "Fushimi Inari",
    title: "Fushimi Inari at sunrise", body: "Start the climb at 6am and the gates are almost empty. Bring water, wear proper shoes, and keep going past the first viewpoint." },
  { who: "tom", interest: "tech", place: null, hoursAgo: 14, rating: 5, price: 3, search: "mechanical keyboard",
    title: "The mechanical keyboard that's actually worth the hype", body: "Quiet linear switches, solid case, no rattle. After two months of daily use I haven't missed my old board once." },
  { who: "mia", interest: "food", place: "kyoto", hoursAgo: 20, rating: 5, price: 2, search: "ramen bowl",
    title: "Must-Try Ramen in Kyoto", body: "Rich, flavourful broth and perfectly chewy noodles. A must-visit when you're in Kyoto. Expect a short queue at lunch." },
  { who: "priya", interest: "travel", place: "tokyo", hoursAgo: 26, rating: 4, price: 2, search: "Shibuya crossing night",
    title: "Shibuya Crossing after dark", body: "Skip the daytime rush. Grab a window seat in the cafe above the station and watch the lights change." },
  { who: "sofia", interest: "travel", place: "lisbon", hoursAgo: 31, rating: 5, price: 1, search: "Lisbon tram 28",
    title: "Tram 28 without the tourist crush", body: "Ride it early from Martim Moniz, then hop off at Graça for the miradouro. Coffee and a pastel de nata at the top." },
  { who: "diego", interest: "food", place: "mexico-city", hoursAgo: 40, rating: 5, price: 1, search: "tacos al pastor",
    title: "Tacos al pastor worth crossing the city for", body: "Shaved off the trompo with pineapple, a squeeze of lime, and salsa verde. Cash only, always a line, always worth it." },
  { who: "hana", interest: "travel", place: "seoul", hoursAgo: 48, rating: 5, price: 1, search: "Gyeongbokgung",
    title: "Gyeongbokgung in hanbok", body: "Rent a hanbok nearby and you get free entry to the palace. Go for the changing of the guard, then walk up to Bukchon." },
  { who: "amara", interest: "vinyl", place: null, hoursAgo: 55, rating: 4, price: 2, search: "vinyl records collection",
    title: "Crate digging finds from the weekend", body: "Three first pressings for the price of one new record. Always flip through the dollar bin first, the good stuff hides there." },
  { who: "chloe", interest: "travel", place: "london", hoursAgo: 70, rating: 5, price: 1, search: "Tower Bridge sunset",
    title: "Tower Bridge at golden hour", body: "Cross to the south bank about an hour before sunset. The light on the bridge is unreal and the walk along the river is free." },
  { who: "noah", interest: "sneakers", place: null, hoursAgo: 80, rating: 4, price: 3, search: "Nike sneakers",
    title: "Retro runners are back", body: "Lightweight, breathable, and surprisingly good for all-day walking. The cushioning on the new version is a big upgrade." },
  { who: "diego", interest: "drinks", place: "mexico-city", hoursAgo: 95, rating: 5, price: 3, search: "mezcal",
    title: "A mezcal bar that actually explains the bottles", body: "Ask for a flight and the bartender walks you through each village and agave. Tasting notes on a chalkboard. Go midweek." },
  { who: "tom", interest: "tech", place: null, hoursAgo: 110, rating: 4, price: 4, search: "wireless headphones",
    title: "Noise-cancelling headphones: still the best travel upgrade", body: "Long flights feel half as long. Battery lasts a full week of commuting and the case is slim enough for a jacket pocket." },
  { who: "sofia", interest: "food", place: "porto", hoursAgo: 130, rating: 4, price: 2, search: "francesinha",
    title: "Francesinha in Porto: go hungry", body: "A sandwich that needs a knife and fork. Share one if you're not starving, and order a cold beer to go with it." },
  { who: "sam", interest: "hobbies", place: null, hoursAgo: 150, rating: 5, price: 2, search: "35mm film camera",
    title: "Starter kit for film photography", body: "A used compact, two rolls of colour film and a local lab. You'll think harder about every frame, and that's the whole point." },
  { who: "amara", interest: "trading-cards", place: null, hoursAgo: 170, rating: 4, price: 2, search: "Pokémon trading cards",
    title: "Binder tips for trading cards", body: "Side-loading sleeves and acid-free pages, and never store them in direct sun. A cheap binder beats a shoebox every time." },
  { who: "priya", interest: "travel", place: null, hoursAgo: 200, rating: 5, price: 1, search: "Moraine Lake",
    title: "A mountain lake worth the early alarm", body: "Be there before sunrise, bring a warm layer, and stay for the colours changing. No location needed, just good boots." },
  { who: "yuki", interest: "shopping", place: "tokyo", hoursAgo: 230, rating: 4, price: 2, search: "Tsukiji market",
    title: "Tsukiji outer market for breakfast", body: "Tamagoyaki on a stick, fresh tuna bowls, and good matcha. Arrive before 9am and bring cash." },
];

const COMMENTS = [
  "Saving this for my next trip!", "Been here, totally agree.", "Adding this to my list right now.",
  "Great find, thanks for sharing!", "This looks amazing. Any tips on the best time to go?",
  "Yes! Can confirm, it's worth it.", "The photo is gorgeous.", "Going next month, so helpful.",
  "Do you remember roughly what it cost?", "Love this, following for more like it.",
];

// ----------------------------------------------------------------------------------------- helpers
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261107);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const sample = (arr, n) => [...arr].sort(() => rand() - 0.5).slice(0, n);
const strip = (html) => String(html ?? "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const OK_LICENSE = /^(CC0|Public domain|PD|CC BY(-SA)?)/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Wikimedia asks for polite use: pace requests and back off when told to slow down. */
async function politeFetch(url, parse) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    await sleep(1500);
    const res = await fetch(url, { headers: UA });
    if (res.ok) {
      const body = await (parse === "json" ? res.text() : res.arrayBuffer());
      if (parse !== "json") return Buffer.from(body);
      try {
        return JSON.parse(body);
      } catch {
        /* rate-limit page came back as text: fall through and retry */
      }
    }
    await sleep(attempt * 8000);
  }
  throw new Error(`Gave up after retries: ${url}`);
}

const UA = { "User-Agent": "zubli-demo-seed/1.0 (development tooling)" };

async function findPhoto(search, used) {
  const params = new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrnamespace: "6", gsrlimit: "30",
    gsrsearch: `${search} filetype:bitmap`, prop: "imageinfo", iiprop: "url|size|extmetadata|mime", iiurlwidth: "1400",
  });
  const json = await politeFetch(`https://commons.wikimedia.org/w/api.php?${params}`, "json");
  const pages = Object.values(json.query?.pages ?? {});
  const candidates = pages
    .map((p) => ({ title: p.title, info: p.imageinfo?.[0], index: p.index ?? 99 }))
    .filter(({ info, title }) =>
      info && info.mime === "image/jpeg" && info.width >= 1600 && info.width / info.height >= 1.25 && info.width / info.height <= 2 &&
      OK_LICENSE.test(info.extmetadata?.LicenseShortName?.value ?? "") && !used.has(title) && !/banner|map|logo|diagram/i.test(title))
    .sort((a, b) => a.index - b.index);
  const best = candidates[0];
  if (!best) throw new Error(`No usable photo found for "${search}"`);
  used.add(best.title);
  const meta = best.info.extmetadata;
  return {
    bytes: await politeFetch(best.info.thumburl, "bytes"),
    width: best.info.thumbwidth, height: best.info.thumbheight,
    title: best.title.replace(/^File:/, ""),
    author: strip(meta.Artist?.value) || "Unknown author",
    license: meta.LicenseShortName.value,
    page: best.info.descriptionurl,
  };
}

async function deleteDemoBlobs() {
  let cursor;
  let removed = 0;
  do {
    const page = await list({ prefix: "post-media/demo_", cursor });
    if (page.blobs.length) {
      await del(page.blobs.map((b) => b.url));
      removed += page.blobs.length;
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return removed;
}

// -------------------------------------------------------------------------------------------- main
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const before = (await client.query("select count(*)::int n from profiles where id like 'demo\\_%'")).rows[0].n;
  console.log(`Existing demo users: ${before}`);
  await client.query("delete from profiles where id like 'demo\\_%'"); // cascades posts, media, likes, saves, comments, follows
  console.log(`Removed old demo rows. Removed demo photos: ${await deleteDemoBlobs()}`);
  if (REMOVE) {
    console.log("Done (removed).");
    process.exit(0);
  }

  // places
  for (const [country, cslug, code, city, slug, lat, lng] of EXTRA_PLACES) {
    await client.query(
      `insert into places (kind, name, slug, country_code, verified)
       select 'country', $1, $2, $3, true where not exists (select 1 from places where parent_id is null and slug = $2)`,
      [country, cslug, code]);
    await client.query(
      `insert into places (parent_id, kind, name, slug, country_code, lat, lng, verified)
       select c.id, 'city', $1, $2, c.country_code, $3, $4, true from places c
       where c.parent_id is null and c.slug = $5
         and not exists (select 1 from places p where p.parent_id = c.id and p.slug = $2)`,
      [city, slug, lat, lng, cslug]);
  }

  // people
  for (const [key, name] of PEOPLE) {
    await client.query("insert into profiles (id, display_name) values ($1, $2)", [`demo_${key}`, name]);
  }

  // posts + photos
  const used = new Set();
  const credits = [];
  const postIds = [];
  for (const p of POSTS) {
    process.stdout.write(`- ${p.title} ... `);
    const photo = await findPhoto(p.search, used);
    const stamp = Date.now();
    const blob = await put(`post-media/demo_${p.who}/${stamp}-${p.search.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.jpg`, photo.bytes, {
      access: "public", contentType: "image/jpeg", addRandomSuffix: true,
    });
    const interest = (await client.query("select id from interests where slug = $1", [p.interest])).rows[0];
    const place = p.place ? (await client.query("select id from places where slug = $1 and kind = 'city'", [p.place])).rows[0] : null;
    if (!interest || (p.place && !place)) throw new Error(`Missing interest/place for "${p.title}" (${p.interest}/${p.place})`);
    const minutes = Math.floor(rand() * 40);
    const post = (await client.query(
      `insert into posts (author_id, interest_id, place_id, title, body, rating, price_band, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now() - make_interval(hours => $8, mins => $9)) returning id, created_at`,
      [`demo_${p.who}`, interest.id, place?.id ?? null, p.title, p.body, p.rating, p.price, p.hoursAgo, minutes])).rows[0];
    await client.query(
      "insert into post_media (post_id, storage_path, width, height, position, alt_text) values ($1, $2, $3, $4, 0, $5)",
      [post.id, blob.url, photo.width, photo.height, `${p.title}. Photo: ${photo.author}, ${photo.license}, via Wikimedia Commons`]);
    postIds.push({ id: post.id, who: p.who, createdAt: post.created_at, hoursAgo: p.hoursAgo });
    credits.push({ post: p.title, ...photo, bytes: undefined });
    console.log("ok");
  }

  // activity: follows, likes, saves, comments
  const keys = PEOPLE.map(([k]) => k);
  for (const k of keys) {
    for (const other of sample(keys.filter((x) => x !== k), 3 + Math.floor(rand() * 4))) {
      await client.query("insert into follows (follower_id, followee_id) values ($1, $2) on conflict do nothing", [`demo_${k}`, `demo_${other}`]);
    }
  }
  for (const post of postIds) {
    const others = keys.filter((k) => k !== post.who);
    const popularity = post.hoursAgo < 60 ? 0.65 : 0.4; // fresher posts are still collecting likes
    for (const k of others) {
      if (rand() < popularity) await client.query("insert into likes (post_id, user_id) values ($1, $2) on conflict do nothing", [post.id, `demo_${k}`]);
      if (rand() < popularity / 2.5) await client.query("insert into saves (post_id, user_id) values ($1, $2) on conflict do nothing", [post.id, `demo_${k}`]);
    }
    const commenters = sample(others, Math.floor(rand() * 4));
    let offsetMinutes = 20 + Math.floor(rand() * 90);
    for (const k of commenters) {
      await client.query(
        `insert into comments (post_id, author_id, body, created_at)
         select $1, $2, $3, least(now() - interval '1 minute', $4::timestamptz + make_interval(mins => $5))`,
        [post.id, `demo_${k}`, pick(COMMENTS), post.createdAt, offsetMinutes]);
      offsetMinutes += 15 + Math.floor(rand() * 240);
    }
  }

  // credits file
  const lines = [
    "# Demo photo credits", "",
    "Photos used by `scripts/demo-seed.mjs`, from Wikimedia Commons under CC0 / CC BY / CC BY-SA.", "",
    ...credits.map((c) => `- **${c.post}**: "${c.title}" by ${c.author}, ${c.license}. ${c.page}`),
  ];
  await writeFile(path.resolve(import.meta.dirname, "..", "docs", "demo-credits.md"), lines.join("\n") + "\n");

  const counts = (await client.query(
    `select (select count(*) from profiles where id like 'demo\\_%') people,
            (select count(*) from posts where author_id like 'demo\\_%') posts,
            (select count(*) from likes where user_id like 'demo\\_%') likes,
            (select count(*) from saves where user_id like 'demo\\_%') saves,
            (select count(*) from comments where author_id like 'demo\\_%') comments,
            (select count(*) from follows where follower_id like 'demo\\_%') follows`)).rows[0];
  console.log("Done:", counts);
} finally {
  await client.end();
}
