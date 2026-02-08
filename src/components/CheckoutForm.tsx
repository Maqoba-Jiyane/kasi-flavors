// components/CheckoutForm.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface UserData {
  name: string;
  email: string;
  phone: string | null;
}

interface Props {
  storeId: string;
  itemsJson: string; // JSON string of { productId, quantity }[]
  totalFormatted: string;
  apiPath?: string; // default /api/customers/orders
  user: UserData;
  deliveryFeeCents?: number;
  deliveryRadiusKm?: number;
}

export function CheckoutForm({
  storeId,
  itemsJson,
  apiPath = "/api/customers/orders",
  deliveryFeeCents,
  deliveryRadiusKm,
}: Props) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [fulfilmentType, setFulfilmentType] = useState<"COLLECTION" | "DELIVERY">(
    "COLLECTION"
  );
  const [paymentMethod, setPaymentMethod] = useState<"CASH_ON_DELIVERY" | "ONLINE_PAYMENT">(
    "CASH_ON_DELIVERY"
  );

  // Location states for "Use my location" feature
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  // Stable idempotency key for this form instance
  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    // Fallback – still reasonably unique
    return `idemp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (processing) return;

    setError(null);
    setProcessing(true);
    setOtpError(null);

    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);

    // Ensure server gets these fields
    fd.set("storeId", storeId);
    fd.set("items", itemsJson);
    fd.set("idempotencyKey", idempotencyKey);
    fd.set("paymentMethod", paymentMethod);

    try {
      const res = await fetch(apiPath, {
        method: "POST",
        body: fd,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        // Special handling for phone verification
        if (json?.code === "PHONE_VERIFICATION_REQUIRED") {
          setShowOtpField(true);
          setOtpError(null);
          setError(
            "We sent a WhatsApp code to your number. Please enter it below."
          );
          setProcessing(false);
          return;
        }

        if (json?.code === "PHONE_VERIFICATION_FAILED") {
          setShowOtpField(true);
          setOtpError(json?.error || "Invalid code. Please try again.");
          setProcessing(false);
          return;
        }

        const msg = json?.error || json?.message || "Failed to place order";
        setError(msg);
        setProcessing(false);
        return;
      }

      const redirectUrl =
        json?.redirectUrl || (json?.orderId ? `/orders/${json.orderId}` : null);

      if (redirectUrl) {
        router.push(redirectUrl);
        return;
      }

      setProcessing(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Network error");
      } else {
        setError("Network error");
      }
      setProcessing(false);
    }
  }

  // Request browser geolocation and populate hidden lat/lng fields
  async function useLocationNow() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation not supported in this browser");
      return;
    }

    setLocating(true);
    setLocationError(null);
    setFormattedAddress(null);
    setGeocoding(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        
        setLatitude(lat);
        setLongitude(lng);
        setUseMyLocation(true);

        // Fetch formatted address from coordinates
        setGeocoding(true);
        setLocating(false);
        
        try {
          const response = await fetch("/api/geocode/reverse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lat, lng }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log("Geocode response:", data);
            if (data.success && data.address) {
              setFormattedAddress(data.address);
            } else {
              console.warn("No address in geocode response");
            }
          } else {
            console.error("Geocode request failed:", response.status);
          }
        } catch (error) {
          console.error("Failed to fetch address:", error);
          // Don't show error to user, we still have coordinates
        } finally {
          setGeocoding(false);
        }
      },
      (err) => {
        setLocationError(err.message || "Unable to retrieve location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function clearLocation() {
    setUseMyLocation(false);
    setLatitude(null);
    setLongitude(null);
    setLocationError(null);
    setFormattedAddress(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 space-y-4 text-sm text-slate-900 dark:text-slate-50"
      aria-busy={processing}
    >
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="useMyLocation" value={useMyLocation ? "true" : "false"} />
      <input type="hidden" name="latitude" value={latitude ?? ""} />
      <input type="hidden" name="longitude" value={longitude ?? ""} />

      {/* fullName, phone, email, fulfilmentType, note, button, etc. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Full name
          </label>
          <input
            name="fullName"
            required
            disabled={processing}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 disabled:opacity-60"
            placeholder="Your full name"
            autoComplete="name"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Phone number
          </label>
          <input
            name="phone"
            disabled={processing}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 disabled:opacity-60"
            placeholder="0732926640"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>

        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
            Email (for confirmation)
          </label>
          <input
            type="email"
            name="email"
            required
            disabled={processing}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 disabled:opacity-60"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
      </div>

      {/* Optional OTP field, only shown if required */}
      {showOtpField && (
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
            WhatsApp verification code
          </label>

          <input
            name="phoneOtp"
            disabled={processing}
            className={`
        w-full rounded-md border bg-white px-3 py-2 text-sm outline-none transition
        placeholder:text-slate-400 disabled:opacity-60
        otp-pulse
        ${otpError ? "otp-shake" : ""}
      `}
            placeholder="Enter the 6-digit code sent to WhatsApp"
            inputMode="numeric"
            autoComplete="one-time-code"
          />

          {otpError && <p className="mt-1 text-xs text-red-500">{otpError}</p>}
        </div>
      )}

      {/* Fulfilment */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Fulfilment
        </label>
        <div className="flex gap-3 text-xs">
          <label className="flex flex-1 cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-60">
            <span className="flex flex-col">
              <span className="font-semibold">Collection</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                You&apos;ll collect from the store
              </span>
            </span>
            <input
              type="radio"
              name="fulfilmentType"
              value="COLLECTION"
              checked={fulfilmentType === "COLLECTION"}
              onChange={() => setFulfilmentType("COLLECTION")}
              disabled={processing}
              className="h-4 w-4"
            />
          </label>

          <label className="flex flex-1 cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-60">
            <span className="flex flex-col">
              <span className="font-semibold">Delivery</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Delivered to your address
                {deliveryFeeCents ? ` • +R${(deliveryFeeCents / 100).toFixed(2)}` : ""}
              </span>
            </span>
            <input
              type="radio"
              name="fulfilmentType"
              value="DELIVERY"
              checked={fulfilmentType === "DELIVERY"}
              onChange={() => setFulfilmentType("DELIVERY")}
              disabled={processing}
              className="h-4 w-4"
            />
          </label>
        </div>

        {fulfilmentType === "DELIVERY" && (
          <div className="mt-3 space-y-3">
            {deliveryRadiusKm && (
              <div className="rounded-md bg-blue-50 p-2 text-xs text-blue-700 dark:bg-blue-950/20 dark:text-blue-400">
                📍 Delivery available within {deliveryRadiusKm}km. Please use "Use my location" to verify your address is within range.
              </div>
            )}
            <div>
              <div className="flex items-center justify-between">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Delivery address
                </label>
                <div className="text-right">
                  {!useMyLocation ? (
                    <button
                      type="button"
                      onClick={useLocationNow}
                      disabled={processing || locating}
                      className="ml-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {locating ? "Locating…" : "Use my location"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={clearLocation}
                      disabled={processing}
                      className="ml-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-700 disabled:opacity-60"
                    >
                      Use different address
                    </button>
                  )}
                </div>
              </div>

              <input
                name="address"
                required={fulfilmentType === "DELIVERY" && !useMyLocation && !deliveryRadiusKm}
                disabled={processing || useMyLocation || !!deliveryRadiusKm}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 disabled:opacity-60 disabled:bg-slate-50"
                placeholder={deliveryRadiusKm ? "Click 'Use my location' above" : "Street address, building, or flat number"}
                autoComplete="street-address"
              />

              {useMyLocation && (
                <div className="mt-2 rounded-md bg-emerald-50 p-3 dark:bg-emerald-950/20">
                  {(locating || geocoding) ? (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      📍 {locating ? "Getting your location..." : "Getting address from your location..."}
                    </p>
                  ) : formattedAddress ? (
                    <div>
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        📍 Your location:
                      </p>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        {formattedAddress}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        ({latitude?.toFixed(5)}, {longitude?.toFixed(5)})
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      📍 Using location: {latitude?.toFixed(5) ?? "?"}, {longitude?.toFixed(5) ?? "?"}
                    </p>
                  )}
                </div>
              )}

              {locationError && <p className="mt-1 text-xs text-red-500">{locationError}</p>}
            </div>

            {!deliveryRadiusKm && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="suburb"
                  disabled={processing || useMyLocation}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 disabled:opacity-60"
                  placeholder="Suburb"
                />
                <input
                  name="city"
                  disabled={processing || useMyLocation}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 disabled:opacity-60"
                  placeholder="City"
                  autoComplete="address-level2"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Payment method
        </label>
        <div className="flex gap-3 text-xs">
          <label className="flex flex-1 cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-60">
            <span className="flex flex-col">
              <span className="font-semibold">Cash on {fulfilmentType === "DELIVERY" ? "Delivery" : "Collection"}</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Pay when your order {fulfilmentType === "DELIVERY" ? "arrives" : "is ready"}
              </span>
            </span>
            <input
              type="radio"
              name="paymentMethod"
              value="CASH_ON_DELIVERY"
              checked={paymentMethod === "CASH_ON_DELIVERY"}
              onChange={() => setPaymentMethod("CASH_ON_DELIVERY")}
              disabled={processing}
              className="h-4 w-4"
            />
          </label>

          <label className="flex flex-1 cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-60">
            <span className="flex flex-col">
              <span className="font-semibold">Pay Online</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Secure payment with card
              </span>
            </span>
            <input
              type="radio"
              name="paymentMethod"
              value="ONLINE_PAYMENT"
              checked={paymentMethod === "ONLINE_PAYMENT"}
              onChange={() => setPaymentMethod("ONLINE_PAYMENT")}
              disabled={processing}
              className="h-4 w-4"
            />
          </label>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Note to store (optional)
        </label>
        <textarea
          name="note"
          rows={2}
          disabled={processing}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 disabled:opacity-60"
          placeholder="Any extra instructions?"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
        <p className="font-medium">Payment</p>
        <p className="mt-1">
          {paymentMethod === "ONLINE_PAYMENT" ? (
            <span className="font-semibold">Secure online payment</span>
          ) : (
            <span className="font-semibold">Cash on {fulfilmentType === "DELIVERY" ? "delivery" : "collection"}</span>
          )}
        </p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={processing}
          className={`inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
            processing ? "opacity-80 cursor-wait" : "hover:bg-emerald-700"
          }`}
        >
          {processing ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin text-white"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              {paymentMethod === "ONLINE_PAYMENT" ? "Redirecting to payment…" : "Processing order…"}
            </>
          ) : (
            paymentMethod === "ONLINE_PAYMENT" ? "Proceed to payment" : "Place order"
          )}
        </button>
      </div>
    </form>
  );
}
