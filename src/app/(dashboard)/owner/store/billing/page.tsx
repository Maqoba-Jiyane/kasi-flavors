// app/(dashboard)/owner/store/billing/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import type { LedgerEntry, LedgerType } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Billing & balance",
  description:
    "View your store’s current balance, recent billing activity, platform fees, and top-ups in the Kasi Flavors owner dashboard.",
  alternates: {
    canonical: "/owner/store/billing",
  },
  openGraph: {
    type: "website",
    title: "Billing & balance | Kasi Flavors",
    description:
      "Check your store balance, transaction history, and platform fee activity in the Kasi Flavors owner billing dashboard.",
    url: "/owner/store/billing",
  },
  twitter: {
    card: "summary",
    title: "Billing & balance | Kasi Flavors",
    description:
      "Monitor your store balance and recent billing transactions in the Kasi Flavors owner dashboard.",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

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

function getLedgerStatusClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-kasi-green/10 text-kasi-green border-kasi-green/20";
    case "PENDING":
      return "bg-golden-yellow/30 text-kasi-black border-golden-yellow/40";
    default:
      return "bg-red-50 text-red-600 border-red-200";
  }
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
      <main className="min-h-screen bg-kasi-cream px-4 py-6">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-black/10 bg-white p-6 text-sm shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            Store setup
          </p>

          <h1 className="mt-2 text-2xl font-black text-kasi-black">
            No store linked to this account
          </h1>

          <p className="mt-2 text-sm font-medium leading-6 text-black/60">
            This owner account does not have a store configured yet. Please
            contact support or complete your store setup.
          </p>
        </div>
      </main>
    );
  }

  const ledgerEntries: LedgerEntry[] = await prisma.ledgerEntry.findMany({
    where: { storeId: store.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const currentBalance = store.creditCents ?? 0;
  const isNegativeBalance = currentBalance < 0;

  return (
    <main className="py-2">
      <div className="space-y-5">
        <header className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Billing
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
              Billing & balance
            </h1>

            <p className="mt-2 text-sm font-medium text-black/60">
              Store billing overview for{" "}
              <span className="font-black text-kasi-black">{store.name}</span>.
            </p>
          </div>

          <div className="flex items-center rounded-[2rem] border border-black/10 bg-white p-4 shadow-sm">
            <Link
              href="/owner/store/orders"
              className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-black"
            >
              ← Back to orders
            </Link>
          </div>
        </header>

        <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-kasi-black text-white shadow-sm">
          <div className="relative p-6">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-street-orange opacity-40 blur-3xl" />
            <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-kasi-green opacity-40 blur-3xl" />

            <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                  Current store balance
                </p>

                <p
                  className={[
                    "mt-2 text-5xl font-black tracking-tight",
                    isNegativeBalance ? "text-red-300" : "text-kasi-green",
                  ].join(" ")}
                >
                  {formatMoney(currentBalance)}
                </p>

                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/65">
                  {isNegativeBalance
                    ? "Your balance is negative. You’ll need to top up before you can open your store and receive new orders."
                    : "Positive balance is used to pay platform fees when orders are completed."}
                </p>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5">
                <p className="text-sm font-black uppercase tracking-wide text-golden-yellow">
                  Need to settle?
                </p>

                <p className="mt-2 max-w-xs text-sm font-medium leading-6 text-white/65">
                  Top up your balance to keep your store active and ready for
                  customer orders.
                </p>

                <Link
                  href="/owner/store/billing/topup"
                  className={[
                    "mt-4 inline-flex rounded-full px-5 py-3 text-sm font-black text-white shadow-sm transition",
                    isNegativeBalance
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-kasi-green hover:bg-street-orange",
                  ].join(" ")}
                >
                  Top up balance
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-black/10 bg-white p-5 text-xs shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                Billing activity
              </p>

              <h2 className="mt-1 text-2xl font-black text-kasi-black">
                Transaction history
              </h2>

              <p className="mt-1 text-sm font-medium text-black/55">
                Platform fees, top-ups, refunds, payouts, and balance changes.
              </p>
            </div>

            <span className="w-fit rounded-full bg-kasi-cream px-3 py-1 text-xs font-black uppercase tracking-wide text-black/50">
              Latest {ledgerEntries.length}
            </span>
          </div>

          {ledgerEntries.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-kasi-cream p-4 text-sm font-medium text-black/60">
              No billing activity yet. When you complete orders, pay fees, or
              top up, transactions will appear here.
            </p>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="mt-4 space-y-3 md:hidden">
                {ledgerEntries.map((entry) => {
                  const isPositive = isCreditPositiveType(entry.type);
                  const sign =
                    entry.type === "FEE_RESERVE"
                      ? ""
                      : isPositive
                        ? "+"
                        : "−";

                  return (
                    <article
                      key={entry.id}
                      className="rounded-[1.5rem] border border-black/10 bg-kasi-cream p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-black/50">
                            {getLedgerTypeLabel(entry.type)}
                          </p>

                          <p className="mt-1 text-xs font-medium text-black/50">
                            {formatDateTime(entry.createdAt)}
                          </p>

                          <p className="mt-1 text-xs font-medium text-black/50">
                            Order:{" "}
                            <span className="font-black text-kasi-black">
                              {entry.orderId
                                ? `#${entry.orderId.slice(-6)}`
                                : "—"}
                            </span>
                          </p>
                        </div>

                        <div className="text-right">
                          <p
                            className={[
                              "text-base font-black",
                              entry.type === "FEE_RESERVE"
                                ? "text-black/60"
                                : isPositive
                                  ? "text-kasi-green"
                                  : "text-red-600",
                            ].join(" ")}
                          >
                            {sign}
                            {formatMoney(entry.amountCents)}
                          </p>

                          <p className="mt-1 text-xs font-medium text-black/50">
                            Balance:{" "}
                            <span className="font-black text-kasi-black">
                              {entry.balanceCents != null
                                ? formatMoney(entry.balanceCents)
                                : "—"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            "inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide",
                            getLedgerStatusClass(entry.status),
                          ].join(" ")}
                        >
                          {entry.status
                            .toLowerCase()
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </div>

                      {entry.note && (
                        <p className="mt-3 text-xs font-medium leading-5 text-black/60">
                          {entry.note}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="mt-4 hidden overflow-hidden rounded-2xl border border-black/10 md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-kasi-black text-white">
                      <tr>
                        <th className="px-4 py-3 font-black uppercase tracking-wide text-white/70">
                          Date
                        </th>
                        <th className="px-4 py-3 font-black uppercase tracking-wide text-white/70">
                          Type
                        </th>
                        <th className="px-4 py-3 font-black uppercase tracking-wide text-white/70">
                          Order
                        </th>
                        <th className="px-4 py-3 text-right font-black uppercase tracking-wide text-white/70">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-right font-black uppercase tracking-wide text-white/70">
                          Balance
                        </th>
                        <th className="px-4 py-3 font-black uppercase tracking-wide text-white/70">
                          Status
                        </th>
                        <th className="px-4 py-3 font-black uppercase tracking-wide text-white/70">
                          Note
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-black/10 bg-white">
                      {ledgerEntries.map((entry) => {
                        const isPositive = isCreditPositiveType(entry.type);
                        const sign =
                          entry.type === "FEE_RESERVE"
                            ? ""
                            : isPositive
                              ? "+"
                              : "−";

                        return (
                          <tr key={entry.id} className="hover:bg-kasi-cream">
                            <td className="whitespace-nowrap px-4 py-3 font-medium text-black/70">
                              {formatDateTime(entry.createdAt)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 font-black text-kasi-black">
                              {getLedgerTypeLabel(entry.type)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-black/60">
                              {entry.orderId
                                ? `#${entry.orderId.slice(-6)}`
                                : "—"}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <span
                                className={[
                                  "font-black",
                                  entry.type === "FEE_RESERVE"
                                    ? "text-black/60"
                                    : isPositive
                                      ? "text-kasi-green"
                                      : "text-red-600",
                                ].join(" ")}
                              >
                                {sign}
                                {formatMoney(entry.amountCents)}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-right font-black text-kasi-black">
                              {entry.balanceCents != null
                                ? formatMoney(entry.balanceCents)
                                : "—"}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3">
                              <span
                                className={[
                                  "inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide",
                                  getLedgerStatusClass(entry.status),
                                ].join(" ")}
                              >
                                {entry.status
                                  .toLowerCase()
                                  .replace(/\b\w/g, (c) => c.toUpperCase())}
                              </span>
                            </td>

                            <td className="max-w-xs truncate px-4 py-3 font-medium text-black/60">
                              {entry.note || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}