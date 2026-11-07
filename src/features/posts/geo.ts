export interface GeoPoint {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * The closest known place (city, neighbourhood or venue with coordinates) within `maxKm` of a point, or null.
 * Countries and regions have no coordinates, so they are never matched directly.
 */
export function nearestPlace<T extends { lat: number | null; lng: number | null }>(
  places: T[],
  point: GeoPoint,
  maxKm = 75,
): { place: T; km: number } | null {
  let best: { place: T; km: number } | null = null;
  for (const place of places) {
    if (place.lat === null || place.lng === null) continue;
    const km = distanceKm(point, { lat: place.lat, lng: place.lng });
    if (km <= maxKm && (!best || km < best.km)) best = { place, km };
  }
  return best;
}
