// app/(dashboard)/owner/store/billing/topup/page.tsx
import Link from "next/link";
import { getRequiredTopupCents } from "@/lib/billing/topUp";
import { formatMoney } from "@/lib/money";
import { OwnerTopupCheckout } from "./OwnerTopupCheckout";
import { getCurrentUserMinimal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OwnerTopupPage() {
  const user = await getCurrentUserMinimal();

  if (!user) {
    return (
      <main className="min-h-screen bg-kasi-cream px-4 py-6">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-black/10 bg-white p-6 text-sm shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Billing
          </p>

          <h1 className="mt-2 text-2xl font-black text-kasi-black">
            Sign in required
          </h1>

          <p className="mt-2 text-sm font-medium text-black/60">
            Please sign in before topping up your store balance.
          </p>

          <Link
            href="/sign-in?redirectUrl=/owner/store/billing/topup"
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
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-black/10 bg-white p-6 text-sm shadow-sm">
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
  const requiredTopupCents = getRequiredTopupCents(currentBalanceCents);
  const isNegative = currentBalanceCents < 0;

  return (
    <main className="py-2">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Top up
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
              Top up platform balance
            </h1>

            <p className="mt-2 text-sm font-medium leading-6 text-black/60">
              Add funds to{" "}
              <span className="font-black text-kasi-black">{store.name}</span>{" "}
              to cover platform fees for upcoming orders.
            </p>
          </div>

          <div className="flex items-center rounded-[2rem] border border-black/10 bg-white p-4 shadow-sm">
            <Link
              href="/owner/store/billing"
              className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-black"
            >
              ← Back to billing
            </Link>
          </div>
        </header>

        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-kasi-black text-white shadow-sm">
          <div className="relative p-6">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-street-orange opacity-40 blur-3xl" />
            <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-kasi-green opacity-40 blur-3xl" />

            <div className="relative grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                  Current store balance
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
                    ? "Your balance is negative. Top up the required amount to reopen your store and continue receiving orders."
                    : "Your positive balance is used to pay platform fees when orders are completed."}
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                  Minimum top up
                </p>

                <p className="mt-2 text-3xl font-black">
                  {formatMoney(requiredTopupCents)}
                </p>

                <p className="mt-2 text-xs font-medium leading-5 text-white/60">
                  Includes {formatMoney(50_00)} minimum plus any negative
                  balance.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Payment
          </p>

          <h2 className="mt-1 text-2xl font-black text-kasi-black">
            Choose top-up amount
          </h2>

          <p className="mt-1 text-sm font-medium text-black/55">
            Enter an amount equal to or greater than the required minimum.
          </p>

          <OwnerTopupCheckout
            currentBalanceCents={currentBalanceCents}
            requiredTopupCents={requiredTopupCents}
          />
        </section>
      </div>
    </main>
  );
}