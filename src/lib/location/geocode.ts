// src/lib/location/geocode.ts

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const query = address.trim();

  if (!query) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");

  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "za");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      // Use your real app/contact details here.
      "User-Agent": "KasiFlavors/1.0 maqoba.emannuel@gmail.com",
      Accept: "application/json",
    },
    // Do not cache forever during development.
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as NominatimResult[];
  const first = Array.isArray(data) ? data[0] : null;

  if (!first?.lat || !first?.lon) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    displayName: first.display_name || query,
  };
}

export function buildSouthAfricanAddress(parts: Array<string | null | undefined>) {
  return [...parts.filter(Boolean), "South Africa"].join(", ");
}