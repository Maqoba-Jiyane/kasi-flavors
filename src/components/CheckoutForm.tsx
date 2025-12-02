"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  storeId: string;
  itemsJson: string; // JSON string of parsedItems
  totalFormatted: string;
  apiPath?: string; // default /api/place-order
}

export function CheckoutForm({
  storeId,
  itemsJson,
  apiPath = "/api/customers/orders",
}: Props) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (processing) return; // guard double-clicks

    setError(null);
    setProcessing(true);

    // Build FormData from the form itself so we include all fields
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);

    // Ensure hidden fields exist (safety)
    fd.set("storeId", storeId);
    fd.set("items", itemsJson);

    try {
      const res = await fetch(apiPath, {
        method: "POST",
        body: fd,
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = json?.error || json?.message || "Failed to place order";
        setError(msg);
        setProcessing(false);
        return;
      }

      const redirectUrl = json?.redirectUrl || (json?.orderId ? `/orders/${json.orderId}` : null);

      if (redirectUrl) {
        // navigate away — processing UI stays until next page loads
        router.push(redirectUrl);
        return;
      }

      // fallback: success but no redirect — show simple success state and re-enable
      setProcessing(false);
    } catch (err) {

      if(err instanceof Error){
        setError(err?.message || "Network error");
        setProcessing(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-sm text-slate-900 dark:text-slate-50" aria-busy={processing}>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="items" value={itemsJson} />

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

      {/* Fulfilment */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
          Fulfilment
        </label>
        <div className="flex gap-3 text-xs">
          <label className="flex flex-1 cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-60">
            <span className="flex flex-col">
              <span className="font-semibold">Collection</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">You&apos;ll collect from the store</span>
            </span>
            <input type="radio" name="fulfilmentType" value="COLLECTION" defaultChecked disabled={processing} className="h-4 w-4" />
          </label>
        </div>
      </div>

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
        <p className="mt-1"><span className="font-semibold">Cash on delivery</span> only for now.</p>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={processing}
          className={`inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${processing ? "opacity-80 cursor-wait" : "hover:bg-emerald-700"}`}
        >
          {processing ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Processing order…
            </>
          ) : (
            "Place order"
          )}
        </button>
      </div>
    </form>
  );
}
