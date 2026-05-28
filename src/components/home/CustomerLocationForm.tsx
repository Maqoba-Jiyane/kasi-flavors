"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const inputCls =
  "w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-semibold text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10";

type LocationState = {
  address: string;
  area: string;
  city: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
};

export function CustomerLocationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [location, setLocation] = useState<LocationState>({
    address: searchParams.get("address") || "",
    area: searchParams.get("area") || "",
    city: searchParams.get("city") || "",
    postalCode: searchParams.get("postalCode") || "",
    lat: searchParams.get("lat") ? Number(searchParams.get("lat")) : null,
    lng: searchParams.get("lng") ? Number(searchParams.get("lng")) : null,
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

    params.set("fulfillment", "collection");

    router.push(`/?${params.toString()}#stores`);
  }

  return (
    <section className="kf-container relative z-10 -mt-6">
      <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Find nearby collection spots
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-kasi-black">
              Where are you collecting from?
            </h2>

            <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-black/55">
              Share your location or enter your area so we can show stores close
              enough for collection.
            </p>
          </div>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={loadingLocation}
            className="rounded-full bg-kasi-black px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingLocation ? "Getting location..." : "Use current location"}
          </button>
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

        {location.lat && location.lng && (
          <p className="mt-4 text-xs font-bold text-black/50">
            Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
        )}

        <form onSubmit={submitLocation} className="mt-5 grid gap-3">
          <input type="hidden" name="lat" value={location.lat ?? ""} />
          <input type="hidden" name="lng" value={location.lng ?? ""} />

          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_0.7fr]">
            <Field label="Address">
              <input
                value={location.address}
                onChange={(event) =>
                  updateField("address", event.target.value)
                }
                placeholder="Street address or landmark"
                className={inputCls}
              />
            </Field>

            <Field label="Area">
              <input
                value={location.area}
                onChange={(event) => updateField("area", event.target.value)}
                placeholder="e.g. Olievenhoutbosch"
                className={inputCls}
              />
            </Field>

            <Field label="City">
              <input
                value={location.city}
                onChange={(event) => updateField("city", event.target.value)}
                placeholder="e.g. Centurion"
                className={inputCls}
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
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium leading-5 text-black/50">
              For best results, use your current location. If you enter your
              address manually, we will estimate your location from the address.
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
    </section>
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