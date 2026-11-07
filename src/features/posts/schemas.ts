import { z } from "zod";

/** Validation for everything that crosses the network boundary (Neon Data API responses + form input). */

export const interestSchema = z.object({
  id: z.uuid(),
  parent_id: z.uuid().nullable(),
  slug: z.string(),
  name: z.string(),
  sort_order: z.number(),
});
export type InterestOption = z.infer<typeof interestSchema>;

export const placeOptionSchema = z.object({
  id: z.uuid(),
  parent_id: z.uuid().nullable(),
  kind: z.enum(["country", "region", "city", "neighborhood", "venue"]),
  posts_count: z.number(),
  name: z.string(),
});
export type PlaceOption = z.infer<typeof placeOptionSchema>;

export const POST_SELECT =
  "id,author_id,title,body,rating,price_band,link_url,created_at,likes_count,comments_count,saves_count," +
  "interests(id,name,slug),places(id,name,kind),profiles(display_name)";

export const postSchema = z.object({
  id: z.uuid(),
  author_id: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  rating: z.number().nullable(),
  price_band: z.number().nullable(),
  link_url: z.string().nullable(),
  created_at: z.string(),
  likes_count: z.number(),
  comments_count: z.number(),
  saves_count: z.number(),
  interests: z.object({ id: z.uuid(), name: z.string(), slug: z.string() }).nullable(),
  places: z.object({ id: z.uuid(), name: z.string(), kind: z.string() }).nullable(),
  profiles: z.object({ display_name: z.string().nullable() }).nullable(),
});
export type PostView = z.infer<typeof postSchema>;

/** What the create form submits. Interest is required; place is optional (never compulsory). */
export const postFormSchema = z.object({
  interest_id: z.uuid({ error: "Pick an interest" }),
  place_id: z.uuid().nullable(),
  title: z.string().trim().min(1, "Add a title").max(140, "Keep the title under 140 characters"),
  body: z.string().trim().max(5000, "Keep it under 5000 characters").nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  price_band: z.number().int().min(1).max(4).nullable(),
  link_url: z.url({ protocol: /^https?$/, error: "Enter a valid http(s) link" }).nullable(),
});
export type PostFormValues = z.infer<typeof postFormSchema>;

/** Flat row returned by the feed RPCs (db/migrations/0003_feed_rpcs.sql). */
export const feedItemSchema = z.object({
  id: z.uuid(),
  author_id: z.string(),
  author_name: z.string().nullable(),
  title: z.string(),
  body: z.string().nullable(),
  rating: z.number().nullable(),
  price_band: z.number().nullable(),
  link_url: z.string().nullable(),
  likes_count: z.number(),
  comments_count: z.number(),
  saves_count: z.number(),
  created_at: z.string(),
  interest_id: z.uuid(),
  interest_name: z.string(),
  interest_slug: z.string(),
  place_id: z.uuid().nullable(),
  place_name: z.string().nullable(),
  place_kind: z.string().nullable(),
});

/** Keyset cursor: the last row's (created_at, id), kept as the raw strings Postgres returned. */
export type FeedCursor = { created_at: string; id: string };

export const feedItemToPost = (r: z.infer<typeof feedItemSchema>): PostView => ({
  id: r.id,
  author_id: r.author_id,
  title: r.title,
  body: r.body,
  rating: r.rating,
  price_band: r.price_band,
  link_url: r.link_url,
  created_at: r.created_at,
  likes_count: r.likes_count,
  comments_count: r.comments_count,
  saves_count: r.saves_count,
  interests: { id: r.interest_id, name: r.interest_name, slug: r.interest_slug },
  places: r.place_id && r.place_name ? { id: r.place_id, name: r.place_name, kind: r.place_kind ?? "venue" } : null,
  profiles: { display_name: r.author_name },
});
