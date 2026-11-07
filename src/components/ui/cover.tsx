import { topicStyle } from "@/features/shared/topics";

/**
 * The image area of an idea or gathering: the real photo when there is one, otherwise a topic-coloured
 * gradient with a large icon, so cards always look photo-led like the mockups.
 */
export function Cover({
  topic,
  src,
  alt = "",
  className = "",
}: {
  topic: string;
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  if (src) {
    // Plain <img>: static export has no image optimizer, and Blob serves already-compressed WebP/JPEG.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} loading="lazy" decoding="async" className={`bg-muted object-cover ${className}`} />;
  }
  const { Icon, gradient } = topicStyle(topic);
  return (
    <div aria-hidden className={`relative overflow-hidden bg-linear-to-br ${gradient} ${className}`}>
      <Icon className="absolute -right-3 -bottom-3 size-2/3 text-white/30" strokeWidth={1.5} />
    </div>
  );
}
