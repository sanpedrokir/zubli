/** Row types mirroring db/migrations/0002_core_schema.sql. Keep in sync by hand until codegen is added. */

export type PlaceKind = "country" | "region" | "city" | "neighborhood" | "venue";
export type PostStatus = "published" | "hidden" | "removed";

export interface Interest {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface Place {
  id: string;
  parent_id: string | null;
  kind: PlaceKind;
  name: string;
  slug: string;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
  verified: boolean;
  posts_count: number;
  ancestor_ids: string[];
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export interface Post {
  id: string;
  author_id: string;
  interest_id: string;
  /** Nullable by design: location is never compulsory. */
  place_id: string | null;
  title: string;
  body: string | null;
  rating: number | null;
  price_band: number | null;
  link_url: string | null;
  status: PostStatus;
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
  updated_at: string;
}

/** Columns a client may write when creating a post (interest required, place optional). */
export interface PostInsert {
  interest_id: string;
  place_id?: string | null;
  title: string;
  body?: string | null;
  rating?: number | null;
  price_band?: number | null;
  link_url?: string | null;
}

export interface PostMedia {
  id: string;
  post_id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  position: number;
  alt_text: string | null;
}
