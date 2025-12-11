// app/(dashboard)/owner/store/billing/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { LedgerEntry, LedgerType } from "@prisma/client";
import Link from "next/link";

function formatMoney(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

function formatDateTime(d: Date) {
  return d.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLedgerTypeLabel(type: LedgerType) {
  switch (type) {
    case "TOPUP":
      return "Top-up";
    case "REFUND":
      return "Refund";
    case "FEE_DEBIT":
      return "Platform fee";
    case "FEE_RESERVE":
      return "Fee reserve";
    case "PAYOUT":
      return "Payout";
    case "ADJUSTMENT":
      return "Adjustment";
    default:
      return type;
  }
}

function isCreditPositiveType(type: LedgerType) {
  return type === "TOPUP" || type === "REFUND";
}

export default async function BillingPage() {
  const user = await getCurrentUser();
  assertRole(user, ["STORE_OWNER"]);

  const store = await prisma.store.findUnique({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      creditCents: true,
    },
  });

  if (!store) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            No store linked to this account
          </h1>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            This owner account does not have a store configured yet. Please
            contact support or complete your store setup.
          </p>
        </div>
      </main>
    );
  }

  // Load recent ledger entries
  const ledgerEntries: LedgerEntry[] = await prisma.ledgerEntry.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 50, // show latest 50 entries
  });

  const currentBalance = store.creditCents ?? 0;
  const isNegativeBalance = currentBalance < 0;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Billing & Balance
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
              Store billing overview for{" "}
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {store.name}
              </span>
              .
            </p>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            <Link
              href="/owner/store/orders"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ← Back to orders
            </Link>
          </div>
        </header>

        {/* Balance card */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* ...inside your component... */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Current store balance
              </p>

              <p
                className={[
                  "mt-1 text-2xl font-semibold",
                  isNegativeBalance
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-700 dark:text-emerald-300",
                ].join(" ")}
              >
                {formatMoney(currentBalance)}
              </p>

              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {isNegativeBalance
                  ? "Your balance is negative. You’ll need to top up before you can open your store and receive new orders."
                  : "Positive balance is used to pay platform fees when orders are completed."}
              </p>

              <div className="mt-3">
                <Link
                  href="/owner/store/billing/topup"
                  className={[
                    "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm",
                    isNegativeBalance
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white",
                  ].join(" ")}
                >
                  Top up balance
                </Link>
              </div>
            </div>

            {/* Placeholder for future "Top up" CTA */}
            <div className="mt-3 text-xs sm:mt-0">
              {/* Later you can add a real top-up flow here */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Need to settle your balance?
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Contact support to arrange a top-up or settlement.
              </p>
            </div>
          </div>
        </section>

        {/* Transactions table */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Transaction history
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Showing latest {ledgerEntries.length} entries
            </span>
          </div>

          {ledgerEntries.length === 0 ? (
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              No billing activity yet. When you complete orders, pay fees, or
              top up, transactions will appear here.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-[11px] text-slate-700 dark:text-slate-200">
                <thead className="border-b border-slate-100 text-[10px] uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <tr>
                    <th className="py-1 pr-3">Date</th>
                    <th className="py-1 pr-3">Type</th>
                    <th className="py-1 pr-3">Order</th>
                    <th className="py-1 pr-3 text-right">Amount</th>
                    <th className="py-1 pr-3 text-right">Balance</th>
                    <th className="py-1 pr-3">Status</th>
                    <th className="py-1 pr-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map((entry) => {
                    const isPositive = isCreditPositiveType(entry.type);
                    const sign =
                      entry.type === "FEE_RESERVE"
                        ? ""
                        : isPositive
                        ? "+"
                        : "−";

                    return (
                      <tr
                        key={entry.id}
                        className="border-t border-slate-100 dark:border-slate-800"
                      >
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {getLedgerTypeLabel(entry.type)}
                        </td>
                        <td className="py-1 pr-3 whitespace-nowrap">
                          {entry.orderId ? `#${entry.orderId.slice(-6)}` : "—"}
                        </td>
                        <td className="py-1 pr-3 text-right whitespace-nowrap">
                          <span
                            className={[
                              "font-medium",
                              entry.type === "FEE_RESERVE"
                                ? "text-slate-600 dark:text-slate-300"
                                : isPositive
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-red-600 dark:text-red-400",
                            ].join(" ")}
                          >
                            {sign}
                            {formatMoney(entry.amountCents)}
                          </span>
                        </td>
                        <td className="py-1 pr-3 text-right whitespace-nowrap">
                          {entry.balanceCents != null
                            ? formatMoney(entry.balanceCents)
                            : "—"}
                        </td>
                        <td className="py-1 pr-3 whitespace-nowrap">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                              entry.status === "COMPLETED"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : entry.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
                            ].join(" ")}
                          >
                            {entry.status
                              .toLowerCase()
                              .replace(/\b\w/g, (c) => c.toUpperCase())}
                          </span>
                        </td>
                        <td className="py-1 pr-3 max-w-xs truncate">
                          {entry.note || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
