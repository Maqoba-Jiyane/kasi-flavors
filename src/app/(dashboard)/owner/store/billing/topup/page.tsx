// app/(dashboard)/owner/billing/topup/page.tsx
import { getRequiredTopupCents } from "@/lib/billing/topUp";
import { formatMoney } from "@/lib/money";
import { OwnerTopupCheckout } from "./OwnerTopupCheckout";
import { getCurrentUserMinimal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OwnerTopupPage() {
  const user = await getCurrentUserMinimal(); // however you fetch it

  const store = await prisma.store.findUnique({
    where: {
      ownerId: user?.id,
    },
  });

  if (!store) {
    // You can redirect or show an error
    return (
      <div className="p-4 text-sm text-red-600">
        Unable to load store. Please try again.
      </div>
    );
  }

  const currentBalanceCents = store.creditCents ?? 0;
  const requiredTopupCents = getRequiredTopupCents(currentBalanceCents);
  const isNegative = currentBalanceCents < 0;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
        Top up platform balance
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Top up your store balance to cover platform fees for upcoming orders.
      </p>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Current store balance
            </p>
            <p
              className={[
                "mt-1 text-2xl font-semibold",
                isNegative
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-700 dark:text-emerald-300",
              ].join(" ")}
            >
              {formatMoney(currentBalanceCents)}
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {isNegative
                ? "Your balance is negative. Top up the required amount to reopen your store and continue receiving orders."
                : "Your positive balance is used to pay platform fees when orders are completed."}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 px-3 py-2 text-right text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <p className="font-medium uppercase tracking-wide">
              Minimum top up
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formatMoney(requiredTopupCents)}
            </p>
            <p className="mt-0.5">
              Includes {formatMoney(50_00)} minimum + any negative balance.
            </p>
          </div>
        </div>

        <OwnerTopupCheckout
          currentBalanceCents={currentBalanceCents}
          requiredTopupCents={requiredTopupCents}
        />
      </section>
    </main>
  );
}
