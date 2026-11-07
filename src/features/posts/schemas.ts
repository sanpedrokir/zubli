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

/** Flat row returned by every post RPC (post_feed_item in db/migrations/0004_social.sql). */
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
  liked_by_me: z.boolean(),
  saved_by_me: z.boolean(),
  cover_url: z.string().nullable(),
});

export interface PostView {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  rating: number | null;
  price_band: number | null;
  link_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
  saves_count: number;
  liked: boolean;
  saved: boolean;
  cover_url: string | null;
  interests: { id: string; name: string; slug: string };
  places: { id: string; name: string; kind: string } | null;
  profiles: { display_name: string | null };
}

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
  liked: r.liked_by_me,
  saved: r.saved_by_me,
  cover_url: r.cover_url,
  interests: { id: r.interest_id, name: r.interest_name, slug: r.interest_slug },
  places: r.place_id && r.place_name ? { id: r.place_id, name: r.place_name, kind: r.place_kind ?? "venue" } : null,
  profiles: { display_name: r.author_name },
});

export const commentSchema = z.object({
  id: z.uuid(),
  post_id: z.uuid(),
  author_id: z.string(),
  body: z.string(),
  created_at: z.string(),
  profiles: z.object({ display_name: z.string().nullable() }).nullable(),
});
export type CommentView = z.infer<typeof commentSchema>;

export const commentFormSchema = z.object({
  body: z.string().trim().min(1, "Write something first").max(2000, "Keep it under 2000 characters"),
});

export const profileSchema = z.object({
  id: z.string(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  posts_count: z.number(),
  followers_count: z.number(),
  following_count: z.number(),
});
export type ProfileView = z.infer<typeof profileSchema>;

export const postMediaSchema = z.object({
  id: z.uuid(),
  storage_path: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  position: z.number(),
  alt_text: z.string().nullable(),
});
export type PostMediaView = z.infer<typeof postMediaSchema>;

/** A photo already uploaded to Blob, ready to be attached to a post. */
export interface UploadedPhoto {
  url: string;
  width: number;
  height: number;
}
