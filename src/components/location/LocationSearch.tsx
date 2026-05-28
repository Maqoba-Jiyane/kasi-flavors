// components/location/LocationSearch.tsx

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LocationSearchProps = {
  initialAddress?: string;
  initialArea?: string;
  initialCity?: string;
  initialPostalCode?: string;
  initialLat?: number | null;
  initialLng?: number | null;
  showFar?: boolean;
  showClosed?: boolean;
};

type LocationState = {
  address: string;
  area: string;
  city: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
};

const inputClass =
  "w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-semibold text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10";

export function LocationSearch({
  initialAddress = "",
  initialArea = "",
  initialCity = "",
  initialPostalCode = "",
  initialLat = null,
  initialLng = null,
  showFar = false,
  showClosed = false,
}: LocationSearchProps) {
  const router = useRouter();

  const [location, setLocation] = useState<LocationState>({
    address: initialAddress,
    area: initialArea,
    city: initialCity,
    postalCode: initialPostalCode,
    lat: initialLat,
    lng: initialLng,
  });

  const [loadingLocation, setLoadingLocation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof LocationState>(
    key: K,
    value: LocationState[K],
  ) {
    setLocation((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function useCurrentLocation() {
    setMessage(null);
    setError(null);

    if (!navigator.geolocation) {
      setError("Your browser does not support location sharing.");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          setLocation((current) => ({
            ...current,
            lat,
            lng,
          }));

          const res = await fetch("/api/location/reverse-geocode", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({ lat, lng }),
          });

          const data = await res.json();

          if (!res.ok || !data?.success) {
            setMessage(
              "Location captured. We could not find the full address, but nearby stores can still be checked.",
            );
            return;
          }

          const found = data.location;

          console.log("found: ", found)

          setLocation({
            address: found.address || "",
            area: found.area || "",
            city: found.city || "",
            postalCode: found.postalCode || "",
            lat,
            lng,
          });

          setMessage(
            "Location captured. Please confirm your address, then search nearby stores.",
          );
        } catch {
          setError("Location captured, but address lookup failed.");
        } finally {
          setLoadingLocation(false);
        }
      },
      () => {
        setLoadingLocation(false);
        setError(
          "We could not access your location. Please allow location access or enter your location manually.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60_000,
      },
    );
  }

  function submitLocation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);

    const params = new URLSearchParams();

    if (location.address.trim()) {
      params.set("address", location.address.trim());
    }

    if (location.area.trim()) {
      params.set("area", location.area.trim());
    }

    if (location.city.trim()) {
      params.set("city", location.city.trim());
    }

    if (location.postalCode.trim()) {
      params.set("postalCode", location.postalCode.trim());
    }

    if (typeof location.lat === "number" && Number.isFinite(location.lat)) {
      params.set("lat", String(location.lat));
    }

    if (typeof location.lng === "number" && Number.isFinite(location.lng)) {
      params.set("lng", String(location.lng));
    }

    if (showFar) {
      params.set("showFar", "1");
    }

    if (showClosed) {
      params.set("showClosed", "1");
    }

    router.push(`/?${params.toString()}#stores`);
  }

  return (
    <div className="mt-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={loadingLocation}
          className="rounded-full bg-kasi-black px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingLocation ? "Getting location..." : "Use current location"}
        </button>

        {location.lat && location.lng && (
          <p className="text-xs font-bold text-black/50">
            Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
        )}
      </div>

      {message && (
        <p className="mt-4 rounded-2xl border border-kasi-green/20 bg-kasi-green/10 px-4 py-3 text-xs font-bold leading-5 text-kasi-green">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={submitLocation} className="mt-5 grid gap-3">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_0.7fr]">
          <Field label="Address">
            <input
              value={location.address}
              onChange={(event) =>
                updateField("address", event.target.value)
              }
              placeholder="Street address or landmark"
              className={inputClass}
            />
          </Field>

          <Field label="Area">
            <input
              value={location.area}
              onChange={(event) => updateField("area", event.target.value)}
              placeholder="e.g. Olievenhoutbosch"
              className={inputClass}
            />
          </Field>

          <Field label="City">
            <input
              value={location.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="e.g. Centurion"
              className={inputClass}
            />
          </Field>

          <Field label="Postal code">
            <input
              value={location.postalCode}
              onChange={(event) =>
                updateField("postalCode", event.target.value)
              }
              inputMode="numeric"
              placeholder="0187"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium leading-5 text-black/50">
            For best results, use your current location. If you type manually,
            we will estimate your location from your address.
          </p>

          <button
            type="submit"
            className="rounded-full bg-kasi-green px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-street-orange"
          >
            Show nearby stores
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-black uppercase tracking-wide text-black/45">
        {label}
      </span>
      {children}
    </label>
  );
}