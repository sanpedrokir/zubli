import { z } from "zod";
import { TOPIC_SLUGS } from "@/features/shared/topics";

/** Row returned by list_gatherings() (db/migrations/0011). */
export const gatheringSchema = z.object({
  id: z.uuid(),
  host_id: z.string(),
  host_name: z.string().nullable(),
  host_avatar: z.string().nullable(),
  idea_id: z.uuid().nullable(),
  idea_title: z.string().nullable(),
  topic: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  starts_at: z.string(),
  location_text: z.string().nullable(),
  is_online: z.boolean(),
  capacity: z.number().nullable(),
  cover_url: z.string().nullable(),
  cancelled: z.boolean(),
  attendees_count: z.number(),
  joined_by_me: z.boolean(),
  conversation_id: z.uuid().nullable(),
});
export type Gathering = z.infer<typeof gatheringSchema>;

export const attendeeSchema = z.object({
  user_id: z.string(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  is_host: z.boolean(),
  joined_at: z.string(),
});
export type Attendee = z.infer<typeof attendeeSchema>;

const emptyToNull = (v: string) => (v === "" ? null : v);

/** What the create form submits. Place is optional (online, or agreed later in the group chat). */
export const gatheringFormSchema = z
  .object({
    topic: z.enum(TOPIC_SLUGS, { error: "Pick a topic" }),
    title: z.string().trim().min(1, "Give your gathering a title").max(120, "Keep the title under 120 characters"),
    description: z.string().trim().max(4000, "Keep it under 4000 characters").transform(emptyToNull),
    /** From <input type="datetime-local">, interpreted in the browser's timezone. */
    starts_at_local: z.string().min(1, "Pick a date and time"),
    is_online: z.boolean(),
    location_text: z.string().trim().max(200, "Keep the place under 200 characters").transform(emptyToNull),
    capacity: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (v === "") return null;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 2 || n > 500) {
          ctx.addIssue({ code: "custom", message: "Spots must be a whole number from 2 to 500" });
          return z.NEVER;
        }
        return n;
      }),
    idea_id: z.uuid().nullable(),
  })
  .transform((v, ctx) => {
    const start = new Date(v.starts_at_local);
    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({ code: "custom", path: ["starts_at_local"], message: "Pick a valid date and time" });
      return z.NEVER;
    }
    if (start.getTime() < Date.now()) {
      ctx.addIssue({ code: "custom", path: ["starts_at_local"], message: "Pick a time in the future" });
      return z.NEVER;
    }
    const { starts_at_local: _ignored, ...rest } = v;
    void _ignored;
    return { ...rest, starts_at: start.toISOString() };
  });
export type GatheringFormInput = z.input<typeof gatheringFormSchema>;
export type GatheringFormValues = z.output<typeof gatheringFormSchema>;
