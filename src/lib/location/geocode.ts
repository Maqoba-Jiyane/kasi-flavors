// src/lib/location/geocode.ts
import { prisma } from "@/lib/prisma";

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  type?: string;
  class?: string;
  importance?: number;
};

export type GeocodePrecision =
  | "EXACT_ADDRESS"
  | "STREET"
  | "AREA"
  | "CITY"
  | "FAILED";

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
  provider: "cache" | "nominatim";
  precision: GeocodePrecision;
  queryUsed: string;
  address?: string;
  area?: string;
  city?: string;
  postalCode?: string;
};

function cleanPart(value: string | null | undefined) {
  return String(value || "").trim();
}

function makeQueryKey(query: string) {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/,\s*/g, ",");
}

export function buildSouthAfricanAddress(
  parts: Array<string | null | undefined>,
) {
  return [...parts.map(cleanPart).filter(Boolean), "South Africa"].join(", ");
}

function buildFallbackQueries({
  address,
  area,
  city,
  postalCode,
}: {
  address: string;
  area?: string;
  city: string;
  postalCode?: string;
}) {
  const cleanAddress = cleanPart(address);
  const cleanArea = cleanPart(area);
  const cleanCity = cleanPart(city);
  const cleanPostalCode = cleanPart(postalCode);

  const streetWithoutNumber = cleanAddress.replace(/^\d+\s+/, "").trim();

  const queries: Array<{ query: string; precision: GeocodePrecision }> = [];

  if (cleanAddress && cleanArea && cleanCity && cleanPostalCode) {
    queries.push({
      query: buildSouthAfricanAddress([
        cleanAddress,
        cleanArea,
        cleanCity,
        cleanPostalCode,
      ]),
      precision: "EXACT_ADDRESS",
    });
  }

  if (cleanAddress && cleanArea && cleanCity) {
    queries.push({
      query: buildSouthAfricanAddress([cleanAddress, cleanArea, cleanCity]),
      precision: "EXACT_ADDRESS",
    });
  }

  if (streetWithoutNumber && cleanArea && cleanCity) {
    queries.push({
      query: buildSouthAfricanAddress([
        streetWithoutNumber,
        cleanArea,
        cleanCity,
      ]),
      precision: "STREET",
    });
  }

  if (cleanArea && cleanCity && cleanPostalCode) {
    queries.push({
      query: buildSouthAfricanAddress([cleanArea, cleanCity, cleanPostalCode]),
      precision: "AREA",
    });
  }

  if (cleanArea && cleanCity) {
    queries.push({
      query: buildSouthAfricanAddress([cleanArea, cleanCity]),
      precision: "AREA",
    });
  }

  if (cleanCity && cleanPostalCode) {
    queries.push({
      query: buildSouthAfricanAddress([cleanCity, cleanPostalCode]),
      precision: "CITY",
    });
  }

  if (cleanCity) {
    queries.push({
      query: buildSouthAfricanAddress([cleanCity]),
      precision: "CITY",
    });
  }

  return queries;
}

async function geocodeSingleQuery(
  query: string,
  precision: GeocodePrecision,
): Promise<GeocodeResult | null> {
  const queryKey = makeQueryKey(query);

  const cached = await prisma.geocodeCache.findUnique({
    where: { queryKey },
  });

  if (cached) {
    return {
      lat: cached.lat,
      lng: cached.lng,
      displayName: cached.displayName || cached.query,
      provider: "cache",
      precision,
      queryUsed: query,
    };
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");

  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "za");
  url.searchParams.set("addressdetails", "1");

  console.log("[geocode] query:", query);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "KasiFlavors/1.0 maqoba.emannuel@gmail.com",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as NominatimResult[];

  console.log("[geocode] data:", data);

  const first = Array.isArray(data) ? data[0] : null;

  if (!first?.lat || !first?.lon) return null;

  const lat = Number(first.lat);
  const lng = Number(first.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const displayName = first.display_name || query;

  await prisma.geocodeCache.upsert({
    where: { queryKey },
    update: {
      lat,
      lng,
      displayName,
      provider: "nominatim",
    },
    create: {
      query,
      queryKey,
      lat,
      lng,
      displayName,
      provider: "nominatim",
    },
  });

  return {
    lat,
    lng,
    displayName,
    provider: "nominatim",
    precision,
    queryUsed: query,
  };
}

export async function geocodeStoreAddress({
  address,
  area,
  city,
  postalCode,
}: {
  address: string;
  area?: string;
  city: string;
  postalCode?: string;
}): Promise<GeocodeResult | null> {
  const queries = buildFallbackQueries({
    address,
    area,
    city,
    postalCode,
  });

  for (const item of queries) {
    const result = await geocodeSingleQuery(item.query, item.precision);

    if (result) {
      return result;
    }
  }

  return null;
}

type NominatimReverseResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: {
    house_number?: string;
    road?: string;
    street?: string;
    suburb?: string;
    neighbourhood?: string;
    village?: string;
    town?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
};

export async function reverseGeocodeCoordinates({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}): Promise<GeocodeResult | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const queryKey = makeQueryKey(`reverse:${lat.toFixed(6)},${lng.toFixed(6)}`);

  const cached = await prisma.geocodeCache.findUnique({
    where: { queryKey },
  });

  if (cached) {
    return {
      lat: cached.lat,
      lng: cached.lng,
      displayName: cached.displayName || cached.query,
      provider: "cache",
      precision: "EXACT_ADDRESS",
      queryUsed: cached.query,
    };
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");

  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "KasiFlavors/1.0 maqoba.emannuel@gmail.com",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as NominatimReverseResult;

  if (!data?.lat || !data?.lon) return null;

  const resultLat = Number(data.lat);
  const resultLng = Number(data.lon);

  if (!Number.isFinite(resultLat) || !Number.isFinite(resultLng)) return null;

  const road = data.address?.road || data.address?.street || "";
  const houseNumber = data.address?.house_number || "";

  const address = [houseNumber, road].filter(Boolean).join(" ").trim();

  const area =
    data.address?.suburb ||
    data.address?.neighbourhood ||
    data.address?.village ||
    "";

  const city =
    data.address?.city ||
    data.address?.town ||
    data.address?.municipality ||
    data.address?.county ||
    "";

  const postalCode = data.address?.postcode || "";

  const displayName = data.display_name || `${resultLat}, ${resultLng}`;

  await prisma.geocodeCache.upsert({
    where: { queryKey },
    update: {
      lat: resultLat,
      lng: resultLng,
      displayName,
      provider: "nominatim",
    },
    create: {
      query: `reverse:${lat},${lng}`,
      queryKey,
      lat: resultLat,
      lng: resultLng,
      displayName,
      provider: "nominatim",
    },
  });

  return {
    lat: resultLat,
    lng: resultLng,
    displayName,
    provider: "nominatim",
    precision: "EXACT_ADDRESS",
    queryUsed: `reverse:${lat},${lng}`,
    address,
    area,
    city,
    postalCode,
  };
}