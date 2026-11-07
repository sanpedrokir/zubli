import { interestStyle } from "./interest-style";

/**
 * The image area of a post: the real photo when there is one, otherwise an interest-coloured gradient with a
 * large icon. Every card, tile, hero and grid uses this, so photos show up everywhere at once.
 */
export function PostVisual({
  interestSlug,
  src,
  alt = "",
  className = "",
}: {
  interestSlug: string;
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  if (src) {
    // Plain <img>: static export has no image optimizer, and Blob serves already-compressed WebP/JPEG.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" decoding="async" className={`bg-surface object-cover ${className}`} />;
  }
  const { Icon, gradient } = interestStyle(interestSlug);
  return (
    <div aria-hidden className={`relative overflow-hidden bg-linear-to-br ${gradient} ${className}`}>
      <Icon className="absolute -bottom-3 -right-3 size-2/3 text-white/25" strokeWidth={1.5} />
    </div>
  );
}
