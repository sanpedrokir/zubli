import {
  Cpu,
  Footprints,
  Gamepad2,
  Gem,
  Plane,
  ShoppingBag,
  Sparkles,
  Utensils,
  Wine,
  type LucideIcon,
} from "lucide-react";

/** Visual identity per interest, from the approved mockups. Keyed by interest slug. */
export interface InterestStyle {
  Icon: LucideIcon;
  /** Solid tile colour + readable text colour. */
  tile: string;
  /** Gradient used where a photo would go until real images exist. */
  gradient: string;
  /** Pastel pill used in chip rows. */
  chip: string;
}

const STYLES: Record<string, InterestStyle> = {
  travel: { Icon: Plane, tile: "bg-sky-500 text-white", gradient: "from-sky-500 to-violet-500", chip: "bg-turquoise-500/25" },
  food: { Icon: Utensils, tile: "bg-orange-500 text-white", gradient: "from-orange-500 to-yellow-500", chip: "bg-yellow-500/30" },
  drinks: { Icon: Wine, tile: "bg-coral-500 text-white", gradient: "from-coral-500 to-orange-500", chip: "bg-coral-500/20" },
  shopping: { Icon: ShoppingBag, tile: "bg-violet-500 text-white", gradient: "from-violet-500 to-pink-500", chip: "bg-violet-500/20" },
  tech: { Icon: Cpu, tile: "bg-violet-600 text-white", gradient: "from-violet-600 to-sky-500", chip: "bg-violet-500/20" },
  footwear: { Icon: Footprints, tile: "bg-turquoise-500 text-navy-900", gradient: "from-turquoise-500 to-sky-500", chip: "bg-turquoise-500/25" },
  hobbies: { Icon: Gamepad2, tile: "bg-pink-500 text-white", gradient: "from-pink-500 to-orange-500", chip: "bg-pink-500/15" },
  collectibles: { Icon: Gem, tile: "bg-yellow-500 text-navy-900", gradient: "from-yellow-500 to-orange-500", chip: "bg-yellow-500/30" },
  other: { Icon: Sparkles, tile: "bg-pink-500 text-white", gradient: "from-pink-500 to-violet-500", chip: "bg-pink-500/15" },
};

/** Child interests inherit their parent's look. */
const PARENT: Record<string, string> = {
  "street-food": "food",
  coffee: "food",
  sneakers: "footwear",
  vinyl: "collectibles",
  "trading-cards": "collectibles",
};

export function interestStyle(slug: string | null | undefined): InterestStyle {
  const key = slug ? (PARENT[slug] ?? slug) : "other";
  return STYLES[key] ?? STYLES.other;
}

