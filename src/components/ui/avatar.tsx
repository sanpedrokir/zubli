/** Round avatar: the person's photo, or their initial on a brand gradient. */
export function Avatar({
  name,
  src,
  size = 40,
  ring = false,
}: {
  name: string | null | undefined;
  src?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const style = { width: size, height: size };
  const ringClass = ring ? "border-4 border-pink-500" : "";
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote avatar; static export has no image optimizer
      <img src={src} alt="" width={size} height={size} style={style} className={`shrink-0 rounded-full object-cover ${ringClass}`} />
    );
  }
  const initial = (name?.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-pink-500 font-display font-extrabold text-white ${ringClass}`}
    >
      {initial}
    </span>
  );
}
