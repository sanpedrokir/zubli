import {
  Briefcase,
  Cpu,
  Dumbbell,
  GraduationCap,
  HandHeart,
  Mountain,
  Palette,
  Plane,
  Sparkles,
  Users,
  Utensils,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

/** Topics shared by ideas and gatherings. Must match the check constraint in db/migrations/0011. */
export const TOPIC_SLUGS = [
  "outdoors",
  "fitness",
  "arts",
  "learning",
  "volunteering",
  "travel",
  "food",
  "social",
  "business",
  "mentoring",
  "tech",
  "other",
] as const;
export type Topic = (typeof TOPIC_SLUGS)[number];

export interface TopicStyle {
  label: string;
  Icon: LucideIcon;
  /** Solid tile colour + readable text colour (the colourful grid in the mockups). */
  tile: string;
  /** Used where a photo would go when there isn't one. */
  gradient: string;
  /** Pastel pill for chip rows. */
  chip: string;
}

export const TOPICS: Record<Topic, TopicStyle> = {
  outdoors: { label: "Outdoors", Icon: Mountain, tile: "bg-turquoise-500 text-navy-900", gradient: "from-turquoise-500 to-sky-500", chip: "bg-turquoise-500/20" },
  fitness: { label: "Fitness & wellness", Icon: Dumbbell, tile: "bg-coral-500 text-white", gradient: "from-coral-500 to-orange-500", chip: "bg-coral-500/15" },
  arts: { label: "Arts & crafts", Icon: Palette, tile: "bg-pink-500 text-white", gradient: "from-pink-500 to-violet-500", chip: "bg-pink-500/15" },
  learning: { label: "Learning", Icon: GraduationCap, tile: "bg-violet-500 text-white", gradient: "from-violet-500 to-sky-500", chip: "bg-violet-500/15" },
  volunteering: { label: "Volunteering", Icon: HandHeart, tile: "bg-yellow-500 text-navy-900", gradient: "from-yellow-500 to-coral-500", chip: "bg-yellow-500/25" },
  travel: { label: "Travel", Icon: Plane, tile: "bg-sky-500 text-white", gradient: "from-sky-500 to-violet-500", chip: "bg-sky-500/20" },
  food: { label: "Food & cooking", Icon: Utensils, tile: "bg-orange-500 text-white", gradient: "from-orange-500 to-yellow-500", chip: "bg-orange-500/15" },
  social: { label: "Social", Icon: Users, tile: "bg-violet-600 text-white", gradient: "from-violet-600 to-pink-500", chip: "bg-violet-500/15" },
  business: { label: "Business & side hustles", Icon: Briefcase, tile: "bg-navy-900 text-white", gradient: "from-navy-900 to-violet-600", chip: "bg-navy-900/10" },
  mentoring: { label: "Mentoring", Icon: Lightbulb, tile: "bg-yellow-500 text-navy-900", gradient: "from-yellow-500 to-orange-500", chip: "bg-yellow-500/25" },
  tech: { label: "Tech", Icon: Cpu, tile: "bg-sky-500 text-white", gradient: "from-violet-600 to-sky-500", chip: "bg-sky-500/20" },
  other: { label: "Other", Icon: Sparkles, tile: "bg-pink-500 text-white", gradient: "from-pink-500 to-orange-500", chip: "bg-pink-500/15" },
};

export function topicStyle(slug: string | null | undefined): TopicStyle {
  return slug && slug in TOPICS ? TOPICS[slug as Topic] : TOPICS.other;
}

export const IDEA_KINDS = {
  activity: { label: "Activity", plural: "Activities", chip: "bg-turquoise-500/20 text-navy-900" },
  career: { label: "Career", plural: "Careers", chip: "bg-yellow-500/30 text-navy-900" },
} as const;
export type IdeaKind = keyof typeof IDEA_KINDS;
