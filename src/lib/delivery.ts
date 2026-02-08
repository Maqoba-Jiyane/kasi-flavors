import { withinRadiusKm } from "./geo";

export function assertStoreHasDeliveryConfig(store: {
  supportsDelivery: boolean;
  deliveryRadiusKm: number | null;
  deliveryFeeCents: number | null;
  lat: number | null;
  lng: number | null;
}) {
  if (!store.supportsDelivery) {
    return { ok: false as const, error: "Store does not support delivery" };
  }
  if (!store.deliveryRadiusKm || store.deliveryRadiusKm <= 0) {
    return { ok: false as const, error: "Store delivery radius not set" };
  }
  if (store.deliveryFeeCents == null || store.deliveryFeeCents < 0) {
    return { ok: false as const, error: "Store delivery fee not set" };
  }
  if (store.lat == null || store.lng == null) {
    return { ok: false as const, error: "Store location (lat/lng) not set" };
  }
  return { ok: true as const };
}

export function checkDeliveryRadius(params: {
  store: {
    supportsDelivery: boolean;
    deliveryRadiusKm: number | null;
  deliveryFeeCents: number | null;
    lat: number | null;
    lng: number | null;
  };
  destination: { lat: number | null; lng: number | null };
}) {
  const cfg = assertStoreHasDeliveryConfig(params.store);
  if (!cfg.ok) return cfg;

  const { lat, lng } = params.destination;
  if (lat == null || lng == null) {
    return { ok: false as const, error: "Destination coordinates missing" };
  }

  const radiusKm = params.store.deliveryRadiusKm!;
  const res = withinRadiusKm(
    { lat: params.store.lat!, lng: params.store.lng! },
    { lat, lng },
    radiusKm,
  );

  if (!res.ok) {
    return {
      ok: false as const,
      error: `Address is outside delivery radius (${res.distanceKm.toFixed(
        2,
      )} km > ${radiusKm} km)`,
      distanceKm: res.distanceKm,
    };
  }

  return { ok: true as const, distanceKm: res.distanceKm };
}
