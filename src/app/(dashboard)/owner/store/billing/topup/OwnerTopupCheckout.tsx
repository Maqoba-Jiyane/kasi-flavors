"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { getRequiredTopupCents } from "@/lib/billing/topUp";
import { createTopupCheckoutSession } from "./actions";

type Props = {
  currentBalanceCents: number;
  requiredTopupCents: number;
};

export function OwnerTopupCheckout({
  currentBalanceCents,
  requiredTopupCents,
}: Props) {
  const router = useRouter();
  const [amountInput, setAmountInput] = React.useState(
    (requiredTopupCents / 100).toFixed(2),
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const raw = amountInput.replace(",", ".");
    const parsed = Number(raw);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    const amountCents = Math.round(parsed * 100);
    const minCents = getRequiredTopupCents(currentBalanceCents);

    if (amountCents < minCents) {
      setError(
        `Minimum top up is ${formatMoney(
          minCents,
        )}. Please increase the amount.`,
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await createTopupCheckoutSession(amountCents);

      if (result?.redirectUrl) {
        router.push(result.redirectUrl);
      } else {
        setError("Unable to start checkout. Please try again.");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-700 dark:text-slate-200">
          Top up amount (ZAR)
        </label>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            R
          </span>
          <input
            type="number"
            step="0.01"
            min={requiredTopupCents / 100}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Minimum top up:{" "}
          <span className="font-semibold">
            {formatMoney(requiredTopupCents)}
          </span>
          .
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        {submitting ? "Starting checkout..." : "Proceed to payment"}
      </button>
    </form>
  );
}
