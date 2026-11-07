// Custom loader required by static export (the default loader needs a server).
// Passthrough for now; M3 adds Supabase Storage transformation params here.
export default function imageLoader({ src }: { src: string; width: number; quality?: number }) {
  return src;
}
