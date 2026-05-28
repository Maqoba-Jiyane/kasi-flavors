"use client";

import { useState } from "react";

type StoreGeneralSettingsFormProps = {
  store: {
    name: string;
    address: string;
    city: string;
    area: string;
    postalCode?: string | null;
    lat?: number | null;
    lng?: number | null;
    avgPrepTimeMinutes: number;
    onlinePaymentsEnabled: boolean;
  };
  action: (formData: FormData) => void | Promise<void>;
};

const inputCls =
  "w-full rounded-2xl border-2 border-black/10 bg-kasi-cream px-4 py-3 text-sm font-semibold text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:bg-white focus:ring-4 focus:ring-kasi-green/10";

export function StoreGeneralSettingsForm({
  store,
  action,
}: StoreGeneralSettingsFormProps) {
  const [address, setAddress] = useState(store.address || "");
  const [area, setArea] = useState(store.area || "");
  const [city, setCity] = useState(store.city || "");
  const [postalCode, setPostalCode] = useState(store.postalCode || "");
  const [lat, setLat] = useState<number | null>(store.lat ?? null);
  const [lng, setLng] = useState<number | null>(store.lng ?? null);

  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  async function useCurrentLocation() {
    setLocationMessage(null);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location sharing.");
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const nextLat = position.coords.latitude;
          const nextLng = position.coords.longitude;

          setLat(nextLat);
          setLng(nextLng);

          const res = await fetch("/api/location/reverse-geocode", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
            body: JSON.stringify({
              lat: nextLat,
              lng: nextLng,
            }),
          });

          const data = await res.json();

          if (!res.ok || !data?.success) {
            setLocationMessage(
              "Location captured, but we could not find the address. You can fill the address manually.",
            );
            return;
          }

          const found = data.location;

          if (found.address) setAddress(found.address);
          if (found.area) setArea(found.area);
          if (found.city) setCity(found.city);
          if (found.postalCode) setPostalCode(found.postalCode);

          setLocationMessage(
            "Location captured. Please confirm the address details before saving.",
          );
        } catch {
          setLocationError("Location captured, but address lookup failed.");
        } finally {
          setLoadingLocation(false);
        }
      },
      () => {
        setLoadingLocation(false);
        setLocationError(
          "We could not access your location. Please allow location access and try again.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60_000,
      },
    );
  }

  return (
    <form action={action} className="mt-6 grid gap-4 text-sm">
      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />

      <div className="rounded-3xl border border-black/10 bg-kasi-cream p-4">
        <p className="text-sm font-black text-kasi-black">
          Store location
        </p>

        <p className="mt-1 text-xs font-medium leading-5 text-black/55">
          Use current location to capture your coordinates and fill the address
          we can find. Please review the address before saving.
        </p>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={loadingLocation}
          className="mt-4 rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingLocation ? "Getting location..." : "Use current location"}
        </button>

        {lat && lng && (
          <p className="mt-3 text-xs font-bold text-black/55">
            Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
        )}

        {locationMessage && (
          <p className="mt-3 rounded-2xl border border-kasi-green/20 bg-kasi-green/10 px-4 py-3 text-xs font-bold text-kasi-green">
            {locationMessage}
          </p>
        )}

        {locationError && (
          <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
            {locationError}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Store name">
          <input
            name="name"
            defaultValue={store.name}
            className={inputCls}
            required
          />
        </Field>

        <Field label="Avg prep time minutes">
          <input
            name="avgPrepTimeMinutes"
            type="number"
            min={5}
            max={180}
            defaultValue={store.avgPrepTimeMinutes}
            className={inputCls}
            required
          />
        </Field>
      </div>

      <Field label="Address">
        <input
          name="address"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className={inputCls}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Area">
          <input
            name="area"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className={inputCls}
            placeholder="e.g. Olievenhoutbosch"
          />
        </Field>

        <Field label="City">
          <input
            name="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className={inputCls}
            required
          />
        </Field>

        <Field label="Postal code">
          <input
            name="postalCode"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            className={inputCls}
            inputMode="numeric"
            placeholder="e.g. 0187"
          />
        </Field>
      </div>

      <div className="rounded-3xl border border-black/10 bg-kasi-cream p-4">
        <label className="flex items-start justify-between gap-4">
          <div>
            <span className="text-sm font-black text-kasi-black">
              Enable online payments
            </span>

            <span className="mt-1 block text-xs font-medium leading-5 text-black/55">
              Customers will only be able to pay online when this is enabled.
              If disabled, customers can still place collection orders and pay
              when collecting, depending on your checkout setup.
            </span>
          </div>

          <input
            name="onlinePaymentsEnabled"
            type="checkbox"
            defaultChecked={store.onlinePaymentsEnabled}
            className="mt-1 h-4 w-4 accent-kasi-green"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-street-orange"
        >
          Save changes
        </button>
      </div>
    </form>
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
      <span className="text-xs font-black uppercase tracking-wide text-black/50">
        {label}
      </span>
      {children}
    </label>
  );
}