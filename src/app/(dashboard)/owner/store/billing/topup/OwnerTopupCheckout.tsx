"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
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
    (requiredTopupCents / 100).toFixed(2)
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
        `Minimum top up is ${formatMoney(minCents)}. Please increase the amount.`
      );
      return;
    }

    try {
      setSubmitting(true);

      const result = await createTopupCheckoutSession(amountCents);

      if (result?.redirectUrl) {
        router.push(result.redirectUrl);
        return;
      }

      setError("Unable to start checkout. Please try again.");
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error(err);
      }

      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-black/55">
          Top up amount ZAR
        </label>

        <div className="flex items-center gap-2">
          <span className="inline-flex h-12 items-center rounded-2xl border-2 border-black/10 bg-kasi-black px-4 text-sm font-black text-white">
            R
          </span>

          <input
            type="number"
            step="0.01"
            min={requiredTopupCents / 100}
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            className="h-12 flex-1 rounded-2xl border-2 border-black/10 bg-kasi-cream px-4 text-sm font-black text-kasi-black outline-none transition placeholder:text-black/35 focus:border-kasi-green focus:bg-white focus:ring-4 focus:ring-kasi-green/10"
          />
        </div>

        <p className="mt-2 text-xs font-medium text-black/55">
          Minimum top up:{" "}
          <span className="font-black text-kasi-black">
            {formatMoney(requiredTopupCents)}
          </span>
          .
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-[1.5rem] bg-kasi-cream p-4">
        <p className="text-xs font-black uppercase tracking-wide text-kasi-black">
          Before you continue
        </p>

        <p className="mt-1 text-xs font-medium leading-5 text-black/60">
          You will be redirected to the payment checkout page. Once payment is
          confirmed, your store balance should update.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center rounded-full bg-kasi-green px-5 py-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting checkout...
          </>
        ) : (
          "Proceed to payment"
        )}
      </button>
    </form>
  );
}