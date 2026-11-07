import { z } from "zod";
import { TOPIC_SLUGS } from "@/features/shared/topics";

/** Row returned by list_ideas() (db/migrations/0011). */
export const ideaSchema = z.object({
  id: z.uuid(),
  author_id: z.string(),
  author_name: z.string().nullable(),
  author_avatar: z.string().nullable(),
  kind: z.enum(["activity", "career"]),
  topic: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  cover_url: z.string().nullable(),
  interested_count: z.number(),
  interested_by_me: z.boolean(),
  created_at: z.string(),
  upcoming_gatherings: z.number(),
});
export type Idea = z.infer<typeof ideaSchema>;

export const interestedPersonSchema = z.object({
  user_id: z.string(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  created_at: z.string(),
});
export type InterestedPerson = z.infer<typeof interestedPersonSchema>;

/** What the create form submits. */
export const ideaFormSchema = z.object({
  kind: z.enum(["activity", "career"], { error: "Pick activity or career" }),
  topic: z.enum(TOPIC_SLUGS, { error: "Pick a topic" }),
  title: z.string().trim().min(1, "Give your idea a title").max(120, "Keep the title under 120 characters"),
  body: z
    .string()
    .trim()
    .max(4000, "Keep it under 4000 characters")
    .transform((v) => (v === "" ? null : v)),
});
export type IdeaFormValues = z.infer<typeof ideaFormSchema>;
