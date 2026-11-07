// Sample ideas, gatherings and chats for development, using the fictitious `demo_*` users from demo-seed.mjs.
//
//   npm run db:demo:ideas           create (or re-create) the sample data
//   npm run db:demo:ideas:remove    delete everything this script created
//
// Needs DATABASE_URL (.env.local). Cover photos reuse the demo photos already on Vercel Blob (credited in
// docs/demo-credits.md); if those were removed, cards fall back to the topic gradient.
// Scope: only rows owned by `demo_%` users, plus (if present) the first real account is added to one
// gathering and one private chat so the Chats screen has something to show. --remove deletes those too.
import pg from "pg";

const REMOVE = process.argv.includes("--remove");
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (.env.local).");

const TZ = process.env.DEMO_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const daysUntil = (weekday) => {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: TZ })).getDay();
  return ((weekday - today + 7) % 7) || 7;
};

const BLOB = "https://sndgleao9j7kz9cm.public.blob.vercel-storage.com/post-media";
const PHOTO = {
  lake: `${BLOB}/demo_priya/1794037937924-moraine-lake-ngiBtL4tt9jwcXEpdMY2hgEtNexmg0.jpg`,
  coffee: `${BLOB}/demo_chloe/1794037853958-latte-art-coffee-3IZWoAYbNyDDZVXsiIHhSFqipCeAIj.jpg`,
  ramen: `${BLOB}/demo_mia/1794037866443-ramen-bowl-TOKNHL95RZq6jx16tJVpffEM3Xd6Hg.jpg`,
  film: `${BLOB}/demo_sam/1794037925332-35mm-film-camera-LpBSsWzSN73QAZavu7AMNocxKL5Xx1.jpg`,
  keyboard: `${BLOB}/demo_tom/1794037862311-mechanical-keyboard-zQEnTNVOoGMeO98GdcnDBhoqXODX9d.jpg`,
  vinyl: `${BLOB}/demo_amara/1794037888733-vinyl-records-collection-Sm0jOtO86hKHXQ5OjUgLkgSPuJFFOS.jpg`,
  tram: `${BLOB}/demo_sofia/1794037875133-lisbon-tram-28-QvBk9LBtXUlhfg62vaKGBzJnWwADzZ.jpg`,
  inari: `${BLOB}/demo_yuki/1794037857891-fushimi-inari-HOLrLMhRgXVVza90p7MuKQ83WuJGGa.jpg`,
  market: `${BLOB}/demo_yuki/1794037944529-tsukiji-market-1UviLw4blGDv0ZcHEDN5247rYL91Il.jpg`,
  bridge: `${BLOB}/demo_chloe/1794037895636-tower-bridge-sunset-VWIWYxD6en1pGLuMHWOle0Llv1N8xX.jpg`,
};

// key: local reference. hoursAgo: when it was posted.
const IDEAS = [
  { key: "walk", who: "priya", kind: "activity", topic: "outdoors", hoursAgo: 2, photo: "lake", interested: ["leo", "hana", "tom", "sofia", "noah"],
    title: "Weekly nature walks for every pace", body: "Retired last spring and walking has been the best thing I've done. Gentle routes, regular stops, nobody gets left behind. Who's in?" },
  { key: "mentor", who: "tom", kind: "career", topic: "mentoring", hoursAgo: 5, photo: null, interested: ["sam", "chloe", "amara", "diego"],
    title: "Mentor someone starting out in your old field", body: "30 years in engineering and I still love talking shop. An hour a month with a graduate makes a real difference to them — and to you." },
  { key: "film", who: "sam", kind: "activity", topic: "arts", hoursAgo: 9, photo: "film", interested: ["yuki", "mia", "chloe"],
    title: "Learn film photography together", body: "Old cameras are cheap, film is fun, and it slows you down. Let's swap tips, shoot a roll each and compare results." },
  { key: "cook", who: "mia", kind: "activity", topic: "food", hoursAgo: 14, photo: "ramen", interested: ["diego", "hana", "noah", "priya", "leo", "amara"],
    title: "Cook-and-share supper club", body: "Each of us brings one dish from a cuisine we've never cooked before. Low pressure, lots of laughs, recipes shared after." },
  { key: "coding", who: "chloe", kind: "career", topic: "tech", hoursAgo: 20, photo: "keyboard", interested: ["tom", "noah"],
    title: "Switching to tech at 45: a study group", body: "I'm learning to code for a second career. Looking for others doing the same to keep each other going — beginners welcome." },
  { key: "garden", who: "hana", kind: "activity", topic: "volunteering", hoursAgo: 30, photo: null, interested: ["priya", "sofia", "mia"],
    title: "Volunteer at a community garden", body: "Two mornings a week planting, weeding and chatting. Great exercise and you take home vegetables. No experience needed." },
  { key: "consult", who: "diego", kind: "career", topic: "business", hoursAgo: 44, photo: null, interested: ["tom", "amara", "leo"],
    title: "Turn your experience into part-time consulting", body: "After leaving full-time work I started advising small restaurants. Happy to share how I set it up, priced it and found clients." },
  { key: "vinyl", who: "amara", kind: "activity", topic: "social", hoursAgo: 60, photo: "vinyl", interested: ["sam", "noah"],
    title: "Record listening afternoons", body: "Bring one album that changed your life. We listen to a side each and talk about why it matters to us." },
  { key: "language", who: "sofia", kind: "activity", topic: "learning", hoursAgo: 75, photo: "tram", interested: ["chloe", "yuki", "leo", "priya"],
    title: "Learn Portuguese before a big trip", body: "Planning six weeks in Lisbon next year. Looking for a conversation buddy or two — all levels, we'll learn together." },
  { key: "teach", who: "leo", kind: "career", topic: "learning", hoursAgo: 100, photo: null, interested: ["hana", "mia"],
    title: "Teaching adults: a rewarding second career", body: "I moved from sales to teaching evening classes. If you've ever thought about it, ask me anything about qualifications and getting started." },
  { key: "fitness", who: "noah", kind: "activity", topic: "fitness", hoursAgo: 130, photo: null, interested: ["tom", "diego", "sam"],
    title: "Gentle strength training in the park", body: "Bodyweight moves, bands and good company. Keeps joints happy and it's free. Any fitness level, any age." },
  { key: "travel", who: "yuki", kind: "activity", topic: "travel", hoursAgo: 160, photo: "inari", interested: ["sofia", "chloe", "hana"],
    title: "Slow travel on a budget", body: "Long stays, local trains, cooking where you stay. Happy to share how I plan month-long trips for less than a week at a resort." },
];

// daysAhead: start day relative to today (negative = past), or weekday: next such day (0 = Sunday … 6 = Saturday).
// hour: start hour in DEMO_TZ (defaults to this computer's time zone). members: who joined.
const GATHERINGS = [
  { key: "g-walk", idea: "walk", who: "priya", topic: "outdoors", weekday: 6, hour: 9, capacity: 10, online: false, photo: "lake",
    place: "Riverside park, main gate", members: ["leo", "hana", "tom", "sofia"], realUser: true,
    title: "Saturday morning nature walk", description: "About 5 km at an easy pace with a coffee stop halfway. Wear comfy shoes and bring water." },
  { key: "g-supper", idea: "cook", who: "mia", topic: "food", daysAhead: 5, hour: 18, capacity: 8, online: false, photo: "ramen",
    place: "Agreed in the chat", members: ["diego", "hana", "noah", "amara", "priya", "leo", "sofia"], realUser: false,
    title: "Supper club #1: noodles from around the world", description: "Bring one noodle dish (or a dessert). We'll share recipes after." },
  { key: "g-code", idea: "coding", who: "chloe", topic: "tech", daysAhead: 3, hour: 19, capacity: 6, online: true, photo: "keyboard",
    place: "Video call — link in the chat", members: ["tom", "noah"], realUser: false,
    title: "Beginner coding study session", description: "We'll work through a free online course together and help each other when stuck." },
  { key: "g-film", idea: "film", who: "sam", topic: "arts", daysAhead: 7, hour: 10, capacity: null, online: false, photo: "film",
    place: "Old town, by the clock tower", members: ["yuki", "mia", "chloe"], realUser: false,
    title: "Film photo walk", description: "Bring any camera (phones welcome too). We'll shoot for two hours then grab lunch." },
  { key: "g-consult", idea: "consult", who: "diego", topic: "business", daysAhead: 9, hour: 14, capacity: 12, online: true, photo: null,
    place: null, members: ["tom", "amara"], realUser: false,
    title: "Ask me anything: starting as a consultant", description: "An informal Q&A. Bring your questions about pricing, contracts and finding your first clients." },
  { key: "g-garden", idea: "garden", who: "hana", topic: "volunteering", daysAhead: 4, hour: 9, capacity: 5, online: false, photo: null,
    place: "Community garden, Elm Street", members: ["priya", "sofia", "mia", "leo"], realUser: false,
    title: "Garden volunteering morning", description: "Planting autumn bulbs. Gloves and tools provided, tea and cake after." },
  { key: "g-vinyl", idea: "vinyl", who: "amara", topic: "social", daysAhead: -6, hour: 15, capacity: 8, online: false, photo: "vinyl",
    place: "Amara's place (address in chat)", members: ["sam", "noah"], realUser: false,
    title: "Record listening afternoon", description: "One life-changing album each." },
];

// Group-chat messages: [gathering key, who, text, minutes after the chat started].
const GROUP_MESSAGES = [
  ["g-walk", "priya", "Welcome everyone! Meeting at the main gate at 9. Forecast looks dry 🌤️", 0],
  ["g-walk", "leo", "Great, see you there. Is there parking nearby?", 30],
  ["g-walk", "priya", "Yes, free car park behind the café.", 45],
  ["g-walk", "hana", "I'll bring some fruit for the halfway stop 🍎", 80],
  ["g-supper", "mia", "So excited! Let's agree a place — I can host this time.", 0],
  ["g-supper", "diego", "I'm bringing dan dan noodles 🌶️", 20],
  ["g-supper", "noah", "I'll do a pad thai. Anyone vegetarian?", 40],
  ["g-supper", "sofia", "Me! Happy to bring a veggie dessert.", 55],
  ["g-code", "chloe", "Link to the course is in my profile notes — start with lesson 1 if you can.", 0],
  ["g-code", "tom", "Done lesson 1 and 2. Variables make sense now!", 90],
  ["g-film", "sam", "Kodak Gold or Portra, anyone have a preference?", 0],
  ["g-film", "yuki", "Gold for the price, honestly. See you there!", 25],
];

// Private chats: [a, b, [[sender, text], ...]]
const DIRECT = [
  ["tom", "sam", [["sam", "Hi Tom, I saw your mentoring idea. I'm 24 and just started in civil engineering — would you be up for a chat?"], ["tom", "Absolutely! How about a call next week?"], ["sam", "Perfect, thank you 🙏"]]],
  ["sofia", "chloe", [["chloe", "I'd love to practise Portuguese with you! I'm a total beginner though."], ["sofia", "Even better, we start together. Tuesday evenings?"]]],
  ["diego", "amara", [["amara", "How did you find your first consulting client?"], ["diego", "A restaurant I used to supply! Start with people who already trust you."]]],
];

const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; })();

const client = new pg.Client({ connectionString: url });
await client.connect();

async function removeAll() {
  const real = (await client.query("select id from profiles where id not like 'demo_%' order by created_at limit 1")).rows[0]?.id;
  // Direct chats between demo users, or between the real account and a demo user (only ones this script makes).
  await client.query("delete from conversations where kind = 'direct' and direct_key like '%demo\\_%' escape '\\'");
  // Gatherings/ideas cascade to members, group chats, messages and interests.
  await client.query("delete from gatherings where host_id like 'demo\\_%' escape '\\'");
  await client.query("delete from ideas where author_id like 'demo\\_%' escape '\\'");
  return real;
}

try {
  await client.query("begin");
  const realUser = await removeAll();
  if (REMOVE) {
    await client.query("commit");
    console.log("Removed sample ideas, gatherings and chats.");
    process.exit(0);
  }

  const demoCount = (await client.query("select count(*)::int n from profiles where id like 'demo\\_%' escape '\\'")).rows[0].n;
  if (demoCount < 12) throw new Error("Demo users are missing. Run `npm run db:demo` first.");

  const ideaIds = {};
  for (const i of IDEAS) {
    const { rows } = await client.query(
      `insert into ideas (author_id, kind, topic, title, body, cover_url, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, now() - make_interval(hours => $7), now() - make_interval(hours => $7)) returning id`,
      [`demo_${i.who}`, i.kind, i.topic, i.title, i.body, i.photo ? PHOTO[i.photo] : null, i.hoursAgo],
    );
    ideaIds[i.key] = rows[0].id;
    for (const k of i.interested) {
      await client.query(
        "insert into idea_interests (idea_id, user_id, created_at) values ($1, $2, now() - make_interval(mins => $3))",
        [rows[0].id, `demo_${k}`, Math.floor(rand() * i.hoursAgo * 60)],
      );
    }
  }

  const gatheringIds = {};
  const chatIds = {};
  for (const g of GATHERINGS) {
    // Inserts bypass RLS (owner), so the "not in the past" policy doesn't apply here; triggers still run
    // (host becomes member, group chat created, counts kept in step).
    const { rows } = await client.query(
      `insert into gatherings (host_id, idea_id, topic, title, description, starts_at, location_text, is_online, capacity, cover_url, created_at)
       values ($1, $2, $3, $4, $5,
               (date_trunc('day', now() at time zone $12) + make_interval(days => $6, hours => $7)) at time zone $12,
               $8, $9, $10, $11, now() - interval '2 days') returning id`,
      [`demo_${g.who}`, ideaIds[g.idea] ?? null, g.topic, g.title, g.description, g.daysAhead ?? daysUntil(g.weekday), g.hour,
       g.place, g.online, g.capacity, g.photo ? PHOTO[g.photo] : null, TZ],
    );
    gatheringIds[g.key] = rows[0].id;
    const members = g.members.map((k) => `demo_${k}`);
    if (g.realUser && realUser) members.push(realUser);
    for (const m of members) {
      await client.query("insert into gathering_members (gathering_id, user_id) values ($1, $2)", [rows[0].id, m]);
    }
    chatIds[g.key] = (await client.query("select id from conversations where gathering_id = $1", [rows[0].id])).rows[0].id;
  }

  const insertMessage = (conversation, sender, body, minutesAgo) =>
    client.query(
      "insert into messages (conversation_id, sender_id, body, created_at) values ($1, $2, $3, now() - make_interval(mins => $4))",
      [conversation, sender, body, minutesAgo],
    );

  // Group chats: spread over the last day, oldest first. Everyone in the chat has read up to "now",
  // except the real account, which sees them as unread.
  for (const [key, who, text, after] of GROUP_MESSAGES) {
    await insertMessage(chatIds[key], `demo_${who}`, text, 24 * 60 - after);
  }

  for (const [a, b, lines] of DIRECT) {
    const ids = [`demo_${a}`, `demo_${b}`].sort();
    const { rows } = await client.query("insert into conversations (kind, direct_key) values ('direct', $1) returning id", [ids.join("|")]);
    await client.query("insert into conversation_members (conversation_id, user_id) values ($1, $2), ($1, $3)", [rows[0].id, ids[0], ids[1]]);
    let minutesAgo = 300;
    for (const [who, text] of lines) {
      await insertMessage(rows[0].id, `demo_${who}`, text, minutesAgo);
      minutesAgo -= 40;
    }
  }

  // A friendly hello to the real account from the walk host, so a private chat shows up for them too.
  if (realUser) {
    const ids = ["demo_priya", realUser].sort();
    const { rows } = await client.query("insert into conversations (kind, direct_key) values ('direct', $1) returning id", [ids.join("|")]);
    await client.query(
      "insert into conversation_members (conversation_id, user_id, last_read_at) values ($1, 'demo_priya', now()), ($1, $2, now() - interval '1 day')",
      [rows[0].id, realUser],
    );
    await insertMessage(rows[0].id, "demo_priya", "Hi! Glad you're joining Saturday's walk 😊 Let me know if you have any questions.", 15);
  }

  // Demo users have read their chats; the real account keeps its unread messages.
  await client.query(
    "update conversation_members set last_read_at = now() where user_id like 'demo\\_%' escape '\\'",
  );
  if (realUser) {
    await client.query(
      "update conversation_members set last_read_at = now() - interval '2 days' where user_id = $1 and conversation_id = $2",
      [realUser, chatIds["g-walk"]],
    );
  }

  await client.query("commit");
  console.log(`Created ${IDEAS.length} ideas, ${GATHERINGS.length} gatherings, ${DIRECT.length + (realUser ? 1 : 0)} private chats.`);
  if (realUser) console.log(`Added ${realUser} to "${GATHERINGS[0].title}" and a private chat with Priya.`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}
