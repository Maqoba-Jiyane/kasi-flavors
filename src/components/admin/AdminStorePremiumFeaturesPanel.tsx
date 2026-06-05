"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AdminImageUploadField from "./AdminImageUploadField";

type Props = {
  storeId: string;
  initialDescription: string | null;
  initialOgImageUrl: string | null;
  initialPremiumEnabled: boolean;
  initialPremiumUntil: string | null;
};

export default function AdminStorePremiumFeaturesPanel({
  storeId,
  initialDescription,
  initialOgImageUrl,
  initialPremiumEnabled,
  initialPremiumUntil,
}: Props) {
  const router = useRouter();

  const [description, setDescription] = React.useState(
    initialDescription ?? "",
  );
  const [ogImageUrl, setOgImageUrl] = React.useState(initialOgImageUrl ?? "");

  const [premiumEnabled, setPremiumEnabled] = React.useState(
    initialPremiumEnabled,
  );

  const [premiumUntil, setPremiumUntil] = React.useState(() => {
    if (!initialPremiumUntil) return "";

    return initialPremiumUntil.slice(0, 10);
  });

  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function saveFeatures() {
    setMessage(null);
    setError(null);

    try {
      setSaving(true);

      const res = await fetch(`/api/admin/stores/${storeId}/premium-features`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          description,
          ogImageUrl,

          premiumEnabled,
          premiumUntil: premiumUntil || null,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        setError(json?.error || "Failed to update premium features.");
        return;
      }

      setMessage("Premium features updated.");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Premium features
          </p>

          <h2 className="mt-1 text-2xl font-black text-kasi-black">
            Store visibility settings
          </h2>

          <p className="mt-1 max-w-2xl text-sm font-medium leading-6 text-black/60">
            Control paid features like product images, custom OpenGraph image,
            and SEO metadata. If premium expires, these features should stop
            showing publicly, but the saved data remains.
          </p>
        </div>

        <span
          className={[
            "w-fit rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1",
            premiumEnabled
              ? "bg-kasi-green/10 text-kasi-green ring-kasi-green/20"
              : "bg-black/10 text-black/55 ring-black/10",
          ].join(" ")}
        >
          {premiumEnabled ? "Premium enabled" : "Premium off"}
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-4">
          <Field label="Store description for SEO">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={inputCls}
              placeholder="Describe the store, food, location, and what customers can order."
            />
          </Field>

          <AdminImageUploadField
            label="OpenGraph image"
            value={ogImageUrl}
            purpose="store-og-image"
            entityId={storeId}
            onUploaded={setOgImageUrl}
          />

          <Field label="OpenGraph image URL">
            <input
              value={ogImageUrl}
              onChange={(e) => setOgImageUrl(e.target.value)}
              className={inputCls}
              placeholder="https://..."
            />
          </Field>

          {ogImageUrl.trim() && (
            <div className="overflow-hidden rounded-3xl border border-black/10 bg-kasi-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ogImageUrl}
                alt="OpenGraph preview"
                className="aspect-[1200/630] w-full object-cover"
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <ToggleRow
            title="Premium active"
            text="Main switch for premium visibility features."
            checked={premiumEnabled}
            onChange={setPremiumEnabled}
          />

          <Field label="Premium until optional">
            <input
              type="date"
              value={premiumUntil}
              onChange={(e) => setPremiumUntil(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {message && (
        <div className="mt-5 rounded-2xl border border-kasi-green/20 bg-kasi-green/10 px-4 py-3 text-sm font-bold text-kasi-green">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={saveFeatures}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save premium settings"}
        </button>
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
      <span className="text-xs font-black uppercase tracking-wide text-black/50">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToggleRow({
  title,
  text,
  checked,
  onChange,
}: {
  title: string;
  text: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-start justify-between gap-4 rounded-3xl border-2 p-4 transition",
        checked
          ? "border-kasi-green bg-kasi-green/10"
          : "border-black/10 bg-kasi-cream hover:border-kasi-green/40",
      ].join(" ")}
    >
      <span>
        <span className="block text-sm font-black text-kasi-black">
          {title}
        </span>
        <span className="mt-1 block text-xs font-medium leading-5 text-black/55">
          {text}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-kasi-green"
      />
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 text-sm font-semibold text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:ring-4 focus:ring-kasi-green/10 disabled:cursor-not-allowed disabled:opacity-60";
