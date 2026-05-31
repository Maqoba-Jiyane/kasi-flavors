"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { getRequiredSettlementPaymentCents } from "@/lib/billing/settlement";
import { createSettlementPaymentSession } from "./actions";

type Props = {
  currentBalanceCents: number;
  requiredSettlementPaymentCents: number;
};

export function OwnerSettlementPaymentCheckout({
  currentBalanceCents,
  requiredSettlementPaymentCents,
}: Props) {
  const router = useRouter();

  const amountInput = (requiredSettlementPaymentCents / 100).toFixed(2);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) return;

    setError(null);

    const amountCents = requiredSettlementPaymentCents;
    const minCents = getRequiredSettlementPaymentCents(currentBalanceCents);

    if (amountCents <= 0) {
      setError("There is no settlement payment required right now.");
      return;
    }

    if (amountCents < minCents) {
      setError(`Settlement amount due is ${formatMoney(minCents)}.`);
      return;
    }

    try {
      setSubmitting(true);

      const result = await createSettlementPaymentSession(amountCents);

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
          Settlement amount ZAR
        </label>

        <div className="flex items-center gap-2">
          <span className="inline-flex h-12 items-center rounded-2xl border-2 border-black/10 bg-kasi-black px-4 text-sm font-black text-white">
            R
          </span>

          <input
            type="number"
            step="0.01"
            min={requiredSettlementPaymentCents / 100}
            value={amountInput}
            readOnly
            className="h-12 flex-1 rounded-2xl border-2 border-black/10 bg-kasi-cream px-4 text-sm font-black text-kasi-black outline-none"
          />
        </div>

        <p className="mt-2 text-xs font-medium text-black/55">
          Amount due:{" "}
          <span className="font-black text-kasi-black">
            {formatMoney(requiredSettlementPaymentCents)}
          </span>
          .
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-3xl bg-kasi-cream p-4">
        <p className="text-xs font-black uppercase tracking-wide text-kasi-black">
          Before you continue
        </p>

        <p className="mt-1 text-xs font-medium leading-5 text-black/60">
          You will be redirected to the payment checkout page. Once payment is
          confirmed, your outstanding balance will be settled.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting || requiredSettlementPaymentCents <= 0}
        className="inline-flex w-full items-center justify-center rounded-full bg-kasi-green px-5 py-4 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-street-orange disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting checkout...
          </>
        ) : (
          "Pay settlement"
        )}
      </button>
    </form>
  );
}