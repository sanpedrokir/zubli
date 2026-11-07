import { interestStyle } from "./interest-style";

/**
 * The image area of a post. Until photo storage exists it renders an interest-coloured gradient with a
 * large icon; when post_media is wired up, render <img> here and every card/tile/hero updates at once.
 */
export function PostVisual({ interestSlug, className = "" }: { interestSlug: string; className?: string }) {
  const { Icon, gradient } = interestStyle(interestSlug);
  return (
    <div aria-hidden className={`relative overflow-hidden bg-linear-to-br ${gradient} ${className}`}>
      <Icon className="absolute -bottom-3 -right-3 size-2/3 text-white/25" strokeWidth={1.5} />
    </div>
  );
}
