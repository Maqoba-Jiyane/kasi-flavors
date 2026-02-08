export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371; // Earth radius (km)
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function toRad(x: number) {
  return (x * Math.PI) / 180;
}

export function withinRadiusKm(
  store: LatLng,
  dest: LatLng,
  radiusKm: number,
) {
  const dist = haversineKm(store, dest);
  return { ok: dist <= radiusKm, distanceKm: dist };
}
