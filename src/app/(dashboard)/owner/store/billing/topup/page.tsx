// app/(dashboard)/owner/store/billing/settlement-payment/page.tsx
import Link from "next/link";
import { getRequiredSettlementPaymentCents } from "@/lib/billing/settlement";
import { formatMoney } from "@/lib/money";
import { OwnerSettlementPaymentCheckout } from "./OwnerSettlementPaymentCheckout";
import { getCurrentUserMinimal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OwnerSettlementPaymentPage() {
  const user = await getCurrentUserMinimal();

  if (!user) {
    return (
      <main className="min-h-screen bg-kasi-cream px-4 py-6">
        <div className="mx-auto max-w-2xl rounded-4xl border border-black/10 bg-white p-6 text-sm shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Billing
          </p>

          <h1 className="mt-2 text-2xl font-black text-kasi-black">
            Sign in required
          </h1>

          <p className="mt-2 text-sm font-medium text-black/60">
            Please sign in before making a settlement payment.
          </p>

          <Link
            href="/sign-in?redirect_url=/owner/store/billing/settlement-payment"
            className="mt-5 inline-flex rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  const store = await prisma.store.findUnique({
    where: {
      ownerId: user.id,
    },
    select: {
      id: true,
      name: true,
      creditCents: true,
    },
  });

  if (!store) {
    return (
      <main className="min-h-screen bg-kasi-cream px-4 py-6">
        <div className="mx-auto max-w-2xl rounded-4xl border border-black/10 bg-white p-6 text-sm shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Store setup
          </p>

          <h1 className="mt-2 text-2xl font-black text-kasi-black">
            Unable to load store
          </h1>

          <p className="mt-2 text-sm font-medium leading-6 text-black/60">
            No store is linked to this account yet. Please contact support or
            complete your store setup.
          </p>

          <Link
            href="/owner/store/billing"
            className="mt-5 inline-flex rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange"
          >
            Back to billing
          </Link>
        </div>
      </main>
    );
  }

  const currentBalanceCents = store.creditCents ?? 0;
  const requiredSettlementPaymentCents =
    getRequiredSettlementPaymentCents(currentBalanceCents);

  const isNegative = currentBalanceCents < 0;
  const hasAmountDue = requiredSettlementPaymentCents > 0;

  return (
    <main className="py-2">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Settlement payment
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
              Settle outstanding balance
            </h1>

            <p className="mt-2 text-sm font-medium leading-6 text-black/60">
              Pay the amount owed by{" "}
              <span className="font-black text-kasi-black">{store.name}</span>{" "}
              to settle platform fees.
            </p>
          </div>

          <div className="flex items-center rounded-4xl border border-black/10 bg-white p-4 shadow-sm">
            <Link
              href="/owner/store/billing"
              className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-black"
            >
              ← Back to billing
            </Link>
          </div>
        </header>

        <section className="overflow-hidden rounded-4xl border border-black/10 bg-kasi-black text-white shadow-sm">
          <div className="relative p-6">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-street-orange opacity-40 blur-3xl" />
            <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-kasi-green opacity-40 blur-3xl" />

            <div className="relative grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                  Current week balance
                </p>

                <p
                  className={[
                    "mt-2 text-5xl font-black tracking-tight",
                    isNegative ? "text-red-300" : "text-kasi-green",
                  ].join(" ")}
                >
                  {formatMoney(currentBalanceCents)}
                </p>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/65">
                  {isNegative
                    ? "Your current week balance is negative. If this is still negative at settlement time, you will need to pay the amount due."
                    : "Your current week balance is not negative, so no settlement payment is required right now."}
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                  Amount due
                </p>

                <p className="mt-2 text-3xl font-black">
                  {formatMoney(requiredSettlementPaymentCents)}
                </p>

                <p className="mt-2 text-xs font-medium leading-5 text-white/60">
                  {hasAmountDue
                    ? "This is the amount required to settle your outstanding balance."
                    : "There is no settlement payment required right now."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Payment
          </p>

          <h2 className="mt-1 text-2xl font-black text-kasi-black">
            Settlement payment
          </h2>

          <p className="mt-1 text-sm font-medium text-black/55">
            Pay the outstanding amount to settle your store balance.
          </p>

          {hasAmountDue ? (
            <OwnerSettlementPaymentCheckout
              currentBalanceCents={currentBalanceCents}
              requiredSettlementPaymentCents={requiredSettlementPaymentCents}
            />
          ) : (
            <div className="mt-6 rounded-3xl border border-kasi-green/20 bg-kasi-green/10 p-4 text-sm font-bold leading-6 text-kasi-green">
              No settlement payment is required right now.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}