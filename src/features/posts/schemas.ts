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
