"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LocationSearchProps = {
  initialLat?: number | null;
  initialLng?: number | null;
  showFar?: boolean;
  showClosed?: boolean;
};

export function LocationSearch({
  initialLat,
  initialLng,
  showFar = false,
  showClosed = false,
}: LocationSearchProps) {
  const router = useRouter();

  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");

  const [loadingAddress, setLoadingAddress] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLocation =
    typeof initialLat === "number" && typeof initialLng === "number";

  function buildUrl(lat: number, lng: number) {
    const params = new URLSearchParams();

    params.set("lat", String(lat));
    params.set("lng", String(lng));

    if (showFar) params.set("showFar", "1");
    if (showClosed) params.set("showClosed", "1");

    return `/?${params.toString()}#stores`;
  }

  async function useTypedAddress() {
    setError(null);

    if (!address.trim() && !area.trim() && !city.trim()) {
      setError("Enter your address, area, or city first.");
      return;
    }

    try {
      setLoadingAddress(true);

      const res = await fetch("/api/location/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address,
          area,
          city,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        setError(json?.error || "We could not find that location.");
        return;
      }

      router.push(buildUrl(json.location.lat, json.location.lng));
    } catch {
      setError("Failed to find your location. Please try again.");
    } finally {
      setLoadingAddress(false);
    }
  }

  function useCurrentLocation() {
    setError(null);

    if (!navigator.geolocation) {
      setError("Your browser does not support location sharing.");
      return;
    }

    setLoadingGps(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        router.push(buildUrl(lat, lng));
      },
      () => {
        setLoadingGps(false);
        setError(
          "We could not get your location. Please allow location access and try again."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60_000,
      }
    );
  }

  function clearLocation() {
    router.push("/");
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Street address or landmark"
          className="kf-input"
        />

        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Area"
          className="kf-input"
        />

        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="kf-input"
        />

        <button
          type="button"
          onClick={useTypedAddress}
          disabled={loadingAddress}
          className="kf-btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAddress ? "Finding..." : "Find food"}
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={loadingGps}
          className="inline-flex items-center justify-center rounded-full border-2 border-black/10 bg-white px-5 py-3 text-sm font-black text-kasi-black transition hover:border-kasi-green hover:text-kasi-green disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingGps ? "Getting your location..." : "Use my current location"}
        </button>

        {hasLocation && (
          <button
            type="button"
            onClick={clearLocation}
            className="inline-flex items-center justify-center rounded-full border-2 border-black/10 bg-white px-5 py-3 text-sm font-black text-kasi-black transition hover:border-kasi-black"
          >
            Reset location
          </button>
        )}
      </div>

      {hasLocation && (
        <div className="rounded-2xl bg-kasi-green/10 px-4 py-3 text-sm font-bold text-kasi-green">
          Location set. Showing collection spots near you.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {hasLocation && (
        <div className="flex flex-wrap gap-2">
          <ToggleLink
            label="Show further stores"
            active={showFar}
            href={`/?lat=${initialLat}&lng=${initialLng}${
              showFar ? "" : "&showFar=1"
            }${showClosed ? "&showClosed=1" : ""}#stores`}
          />

          <ToggleLink
            label="Show closed stores"
            active={showClosed}
            href={`/?lat=${initialLat}&lng=${initialLng}${
              showFar ? "&showFar=1" : ""
            }${showClosed ? "" : "&showClosed=1"}#stores`}
          />
        </div>
      )}
    </div>
  );
}

function ToggleLink({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <a
      href={href}
      className={[
        "inline-flex rounded-full border-2 px-4 py-2 text-xs font-black uppercase tracking-wide transition",
        active
          ? "border-kasi-green bg-kasi-green text-white"
          : "border-black/10 bg-white text-kasi-black hover:border-kasi-green hover:text-kasi-green",
      ].join(" ")}
    >
      {label}
    </a>
  );
}