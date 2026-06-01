// components/CheckoutForm.tsx
"use client";

import React, { useState } from "react";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface UserData {
  name: string;
  email: string;
  phone: string | null;
}

interface Props {
  storeId: string;
  itemsJson: string;
  totalFormatted: string;
  apiPath?: string;
  user: UserData;
  deliveryFeeCents?: number;
  deliveryRadiusKm?: number;
  supportsDelivery?: boolean;
  onlinePaymentsEnabled?: boolean;
  cashOnCollectionEnabled?: boolean;
}

export function CheckoutForm({
  storeId,
  itemsJson,
  apiPath = "/api/customers/orders",
  deliveryFeeCents,
  deliveryRadiusKm,
  supportsDelivery,
  onlinePaymentsEnabled = true,
  cashOnCollectionEnabled = false,
}: Props) {
  const router = useRouter();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtpField, setShowOtpField] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  const [fulfilmentType, setFulfilmentType] = useState<
    "COLLECTION" | "DELIVERY"
  >("COLLECTION");

  type CheckoutPaymentMethod =
    | "ONLINE_PAYMENT"
    | "CASH_ON_COLLECTION"
    | "CASH_ON_DELIVERY";

  const defaultPaymentMethod: CheckoutPaymentMethod = onlinePaymentsEnabled
    ? "ONLINE_PAYMENT"
    : cashOnCollectionEnabled
      ? "CASH_ON_COLLECTION"
      : "ONLINE_PAYMENT";

  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>(defaultPaymentMethod);

  const [useMyLocation, setUseMyLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    return `idemp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  });

  const canPayOnline = onlinePaymentsEnabled === true;

  const canPayCashOnCollection =
    fulfilmentType === "COLLECTION" && cashOnCollectionEnabled === true;

  const canPayCashOnDelivery = fulfilmentType === "DELIVERY";

  // const cashPaymentMethod =
  //   fulfilmentType === "DELIVERY" ? "CASH_ON_DELIVERY" : "CASH_ON_COLLECTION";

  const canUseCurrentPaymentMethod =
    paymentMethod === "ONLINE_PAYMENT"
      ? canPayOnline
      : paymentMethod === "CASH_ON_COLLECTION"
        ? canPayCashOnCollection
        : canPayCashOnDelivery;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (processing) return;

    setError(null);
    setProcessing(true);
    setOtpError(null);

    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);

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
        if (json?.code === "PHONE_VERIFICATION_REQUIRED") {
          setShowOtpField(true);
          setOtpError(null);
          setError(
            "We sent a WhatsApp code to your number. Please enter it below.",
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

            if (data.success && data.address) {
              setFormattedAddress(data.address);
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to fetch address:", error);
          }
        } finally {
          setGeocoding(false);
        }
      },
      (err) => {
        setLocationError(err.message || "Unable to retrieve location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function clearLocation() {
    setUseMyLocation(false);
    setLatitude(null);
    setLongitude(null);
    setLocationError(null);
    setFormattedAddress(null);
  }

  const fieldClass =
    "w-full rounded-2xl border-2 border-black/10 bg-kasi-cream px-4 py-3 text-sm font-semibold text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:bg-white focus:ring-4 focus:ring-kasi-green/10 disabled:cursor-not-allowed disabled:opacity-60";

  const labelClass =
    "mb-1.5 block text-xs font-black uppercase tracking-wide text-black/55";

  const optionCardClass = (active: boolean) =>
    `flex flex-1 cursor-pointer items-center justify-between rounded-2xl border-2 px-4 py-3 transition ${
      active
        ? "border-kasi-green bg-kasi-green/10"
        : "border-black/10 bg-white hover:border-kasi-green/40"
    }`;

function getBestPaymentMethodForFulfilment(
  nextFulfilmentType: "COLLECTION" | "DELIVERY",
): CheckoutPaymentMethod {
  if (onlinePaymentsEnabled) {
    return "ONLINE_PAYMENT";
  }

  if (
    nextFulfilmentType === "COLLECTION" &&
    cashOnCollectionEnabled
  ) {
    return "CASH_ON_COLLECTION";
  }

  if (nextFulfilmentType === "DELIVERY") {
    return "CASH_ON_DELIVERY";
  }

  return "ONLINE_PAYMENT";
}

function handleFulfilmentChange(nextFulfilmentType: "COLLECTION" | "DELIVERY") {
  setFulfilmentType(nextFulfilmentType);

  const nextPaymentMethod =
    getBestPaymentMethodForFulfilment(nextFulfilmentType);

  setPaymentMethod(nextPaymentMethod);
}

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 space-y-5 text-sm text-kasi-black"
      aria-busy={processing}
    >
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="items" value={itemsJson} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input
        type="hidden"
        name="useMyLocation"
        value={useMyLocation ? "true" : "false"}
      />
      <input type="hidden" name="latitude" value={latitude ?? ""} />
      <input type="hidden" name="longitude" value={longitude ?? ""} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Full name</label>
          <input
            name="fullName"
            required
            disabled={processing}
            className={fieldClass}
            placeholder="Your full name"
            autoComplete="name"
          />
        </div>

        <div>
          <label className={labelClass}>Phone number</label>
          <input
            name="phone"
            required
            disabled={processing}
            className={fieldClass}
            placeholder="0732926640"
            inputMode="tel"
            autoComplete="tel"
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Email for confirmation</label>
          <input
            type="email"
            name="email"
            required
            disabled={processing}
            className={fieldClass}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>
      </div>

      {showOtpField && (
        <div className="rounded-3xl border-2 border-street-orange/25 bg-street-orange/10 p-4">
          <label className={labelClass}>WhatsApp verification code</label>

          <input
            name="phoneOtp"
            disabled={processing}
            className={`
              w-full rounded-2xl border-2 bg-white px-4 py-3 text-sm font-semibold text-kasi-black outline-none transition
              placeholder:text-black/35 disabled:opacity-60 otp-pulse
              ${otpError ? "otp-shake border-red-500" : "border-street-orange"}
            `}
            placeholder="Enter the 6-digit code sent to WhatsApp"
            inputMode="numeric"
            autoComplete="one-time-code"
          />

          {otpError ? (
            <p className="mt-2 text-xs font-bold text-red-600">{otpError}</p>
          ) : (
            <p className="mt-2 text-xs font-medium text-black/60">
              Check your WhatsApp messages and enter the code here.
            </p>
          )}
        </div>
      )}

      <div>
        <label className={labelClass}>Fulfilment</label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={optionCardClass(fulfilmentType === "COLLECTION")}>
            <span className="flex flex-col">
              <span className="text-sm font-black">Collection</span>
              <span className="mt-1 text-xs font-medium text-black/55">
                Collect from the store
              </span>
            </span>

            <input
              type="radio"
              name="fulfilmentType"
              value="COLLECTION"
              checked={fulfilmentType === "COLLECTION"}
              onChange={() => handleFulfilmentChange("COLLECTION")}
              disabled={processing}
              className="h-4 w-4 accent-kasi-green"
            />
          </label>

          {supportsDelivery && (
            <label className={optionCardClass(fulfilmentType === "DELIVERY")}>
              <span className="flex flex-col">
                <span className="text-sm font-black">Delivery</span>
                <span className="mt-1 text-xs font-medium text-black/55">
                  Delivered to your address
                  {deliveryFeeCents
                    ? ` • +R${(deliveryFeeCents / 100).toFixed(2)}`
                    : ""}
                </span>
              </span>

              <input
                type="radio"
                name="fulfilmentType"
                value="DELIVERY"
                checked={fulfilmentType === "DELIVERY"}
                onChange={() => handleFulfilmentChange("DELIVERY")}
                disabled={processing}
                className="h-4 w-4 accent-kasi-green"
              />
            </label>
          )}
        </div>

        {fulfilmentType === "DELIVERY" && (
          <div className="mt-4 space-y-4 rounded-3xl border border-black/10 bg-white p-4">
            {deliveryRadiusKm && (
              <div className="rounded-2xl bg-golden-yellow/25 p-3 text-xs font-bold leading-5 text-kasi-black">
                📍 Delivery is available within {deliveryRadiusKm}km. Use your
                location to help verify that your address is within range.
              </div>
            )}

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="block text-xs font-black uppercase tracking-wide text-black/55">
                  Delivery address
                </label>

                {!useMyLocation ? (
                  <button
                    type="button"
                    onClick={useLocationNow}
                    disabled={processing || locating}
                    className="inline-flex items-center gap-1.5 rounded-full bg-kasi-green px-3 py-1.5 text-xs font-black text-white transition hover:bg-street-orange disabled:opacity-60"
                  >
                    {locating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <MapPin className="h-3.5 w-3.5" />
                    )}
                    {locating ? "Locating…" : "Use my location"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={clearLocation}
                    disabled={processing}
                    className="rounded-full bg-black/10 px-3 py-1.5 text-xs font-black text-kasi-black transition hover:bg-black/15 disabled:opacity-60"
                  >
                    Use different address
                  </button>
                )}
              </div>

              <input
                name="address"
                required={
                  fulfilmentType === "DELIVERY" &&
                  !useMyLocation &&
                  !deliveryRadiusKm
                }
                disabled={processing || useMyLocation || !!deliveryRadiusKm}
                className={fieldClass}
                placeholder={
                  deliveryRadiusKm
                    ? "Click 'Use my location' above"
                    : "Street address, building, or flat number"
                }
                autoComplete="street-address"
              />

              {useMyLocation && (
                <div className="mt-3 rounded-2xl bg-kasi-green/10 p-4">
                  {locating || geocoding ? (
                    <p className="flex items-center gap-2 text-xs font-bold text-black/65">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {locating
                        ? "Getting your location..."
                        : "Getting address from your location..."}
                    </p>
                  ) : formattedAddress ? (
                    <div>
                      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-kasi-green">
                        <CheckCircle2 className="h-4 w-4" />
                        Your location
                      </p>

                      <p className="mt-2 text-sm font-semibold leading-6 text-kasi-black">
                        {formattedAddress}
                      </p>

                      <p className="mt-1 text-xs font-medium text-black/45">
                        ({latitude?.toFixed(5)}, {longitude?.toFixed(5)})
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-black/60">
                      📍 Using location: {latitude?.toFixed(5) ?? "?"},{" "}
                      {longitude?.toFixed(5) ?? "?"}
                    </p>
                  )}
                </div>
              )}

              {locationError && (
                <p className="mt-2 text-xs font-bold text-red-600">
                  {locationError}
                </p>
              )}
            </div>

            {!deliveryRadiusKm && (
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="suburb"
                  disabled={processing || useMyLocation}
                  className={fieldClass}
                  placeholder="Suburb"
                />

                <input
                  name="city"
                  disabled={processing || useMyLocation}
                  className={fieldClass}
                  placeholder="City"
                  autoComplete="address-level2"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className={labelClass}>Payment method</label>

        <div className="grid gap-3 sm:grid-cols-2">
          {canPayOnline && (
            <label
              className={optionCardClass(paymentMethod === "ONLINE_PAYMENT")}
            >
              <span className="flex flex-col">
                <span className="text-sm font-black">Pay online</span>

                <span className="mt-1 text-xs font-medium text-black/55">
                  Secure card payment. Recommended.
                </span>
              </span>

              <input
                type="radio"
                name="paymentMethod"
                value="ONLINE_PAYMENT"
                checked={paymentMethod === "ONLINE_PAYMENT"}
                onChange={() => setPaymentMethod("ONLINE_PAYMENT")}
                disabled={processing}
                className="h-4 w-4 accent-kasi-green"
              />
            </label>
          )}

          {canPayCashOnCollection && (
            <label
              className={optionCardClass(
                paymentMethod === "CASH_ON_COLLECTION",
              )}
            >
              <span className="flex flex-col">
                <span className="text-sm font-black">Cash on collection</span>

                <span className="mt-1 text-xs font-medium text-black/55">
                  Pay the store when your order is ready.
                </span>
              </span>

              <input
                type="radio"
                name="paymentMethod"
                value="CASH_ON_COLLECTION"
                checked={paymentMethod === "CASH_ON_COLLECTION"}
                onChange={() => setPaymentMethod("CASH_ON_COLLECTION")}
                disabled={processing}
                className="h-4 w-4 accent-kasi-green"
              />
            </label>
          )}

          {canPayCashOnDelivery && (
            <label
              className={optionCardClass(paymentMethod === "CASH_ON_DELIVERY")}
            >
              <span className="flex flex-col">
                <span className="text-sm font-black">Cash on delivery</span>

                <span className="mt-1 text-xs font-medium text-black/55">
                  Pay when your order arrives.
                </span>
              </span>

              <input
                type="radio"
                name="paymentMethod"
                value="CASH_ON_DELIVERY"
                checked={paymentMethod === "CASH_ON_DELIVERY"}
                onChange={() => setPaymentMethod("CASH_ON_DELIVERY")}
                disabled={processing}
                className="h-4 w-4 accent-kasi-green"
              />
            </label>
          )}
        </div>

        {!canPayOnline &&
          !canPayCashOnCollection &&
          fulfilmentType === "COLLECTION" && (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-600">
              This store is not accepting online payments or cash on collection
              right now. Please try again later.
            </div>
          )}
      </div>

      <div>
        <label className={labelClass}>Note to store optional</label>

        <textarea
          name="note"
          rows={3}
          disabled={processing}
          className={fieldClass}
          placeholder="Example: no tomato, extra sauce, call when ready..."
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-3xl bg-kasi-black p-4 text-white">
        <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
          Payment
        </p>

        <p className="mt-1 text-sm font-medium text-white/70">
          {paymentMethod === "ONLINE_PAYMENT" ? (
            <span>Secure online payment will open after submitting.</span>
          ) : paymentMethod === "CASH_ON_COLLECTION" ? (
            <span>You will pay cash when collecting your order.</span>
          ) : (
            <span>You will pay cash when your delivery arrives.</span>
          )}
        </p>
      </div>

      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={processing || !canUseCurrentPaymentMethod}
          className={`inline-flex w-full items-center justify-center rounded-full px-6 py-4 text-sm font-black text-white shadow-sm transition sm:w-auto ${
            processing
              ? "cursor-wait bg-kasi-green/80"
              : "bg-kasi-green hover:-translate-y-0.5 hover:bg-street-orange"
          }`}
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {paymentMethod === "ONLINE_PAYMENT"
                ? "Redirecting to payment…"
                : "Processing order…"}
            </>
          ) : paymentMethod === "ONLINE_PAYMENT" ? (
            "Proceed to payment"
          ) : (
            "Place order"
          )}
        </button>
      </div>
    </form>
  );
}
