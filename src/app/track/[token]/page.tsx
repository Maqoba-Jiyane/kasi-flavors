// app/track/[token]/page.tsx

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AutoRefresh } from "./AutoRefresh";
import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";

type TrackPageRouteParams = {
  token: string;
};

type TrackPageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<TrackPageRouteParams>;
}): Promise<Metadata> {
  const { token } = await params;

  const title = "Track your order";
  const urlPath = `/track/${token}`;

  return {
    title,
    description:
      "Track the status, codes, and details for your Kasi Flavors order using this secure tracking link.",
    alternates: {
      canonical: urlPath,
    },
    openGraph: {
      type: "website",
      title: `${title} | Kasi Flavors`,
      description:
        "Check the latest status and details for your Kasi Flavors order.",
      url: urlPath,
    },
    twitter: {
      card: "summary",
      title: `${title} | Kasi Flavors`,
      description:
        "Use this secure link to view the current status of your Kasi Flavors order.",
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
}

function formatPrice(priceCents: number) {
  return `R ${(priceCents / 100).toFixed(2)}`;
}

function formatTime(d?: Date | null) {
  if (!d) return "—";

  return d.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

function formatDateTime(d: Date) {
  return d.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  });
}

function humanizeStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusPill({ status }: { status: OrderStatus }) {
  const colorClasses: Record<OrderStatus, string> = {
    PENDING: "bg-golden-yellow/25 text-kasi-black ring-golden-yellow/40",
    ACCEPTED: "bg-blue-50 text-blue-700 ring-blue-100",
    IN_PREPARATION:
      "bg-street-orange/10 text-street-orange ring-street-orange/20",
    READY_FOR_COLLECTION:
      "bg-kasi-green/10 text-kasi-green ring-kasi-green/20",
    OUT_FOR_DELIVERY: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    COMPLETED: "bg-black/10 text-black/60 ring-black/10",
    CANCELLED: "bg-red-50 text-red-600 ring-red-200",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ring-1",
        colorClasses[status],
      ].join(" ")}
    >
      {humanizeStatus(status)}
    </span>
  );
}

function getStatusMessage(args: {
  status: OrderStatus;
  fulfilmentType: "COLLECTION" | "DELIVERY";
}) {
  const { status, fulfilmentType } = args;
  const isCollection = fulfilmentType === "COLLECTION";

  switch (status) {
    case "PENDING":
      return "Your order has been received and is waiting to be accepted by the store.";
    case "ACCEPTED":
      return "The store has accepted your order and will start preparing it shortly.";
    case "IN_PREPARATION":
      return "Your order is being prepared.";
    case "READY_FOR_COLLECTION":
      return isCollection
        ? "Your order is ready for collection. Take your code with you to the counter."
        : "Your order is almost ready and will be handed to the driver shortly.";
    case "OUT_FOR_DELIVERY":
      return "Your order is with the driver and on its way to you.";
    case "COMPLETED":
      return isCollection
        ? "This order has been collected."
        : "This order has been delivered.";
    case "CANCELLED":
      return "This order has been cancelled.";
    default:
      return "";
  }
}

function shouldShowCode({
  pickupCode,
  status,
  fulfilmentType,
}: {
  pickupCode: string | null;
  status: OrderStatus;
  fulfilmentType: "COLLECTION" | "DELIVERY";
}) {
  if (!pickupCode) return false;
  if (pickupCode.startsWith("MANUAL-")) return false;

  if (fulfilmentType === "COLLECTION") {
    return status === "READY_FOR_COLLECTION" || status === "COMPLETED";
  }

  return status === "OUT_FOR_DELIVERY" || status === "COMPLETED";
}

export default async function TrackOrderPage({ params }: TrackPageProps) {
  const { token } = await params;

  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    include: {
      items: true,
      store: true,
    },
  });

  if (!order) {
    notFound();
  }

  const shortId = order.id.slice(-6);
  const isCollection = order.fulfilmentType === "COLLECTION";

  const statusMessage = getStatusMessage({
    status: order.status,
    fulfilmentType: order.fulfilmentType,
  });

  const showCode = shouldShowCode({
    pickupCode: order.pickupCode,
    status: order.status,
    fulfilmentType: order.fulfilmentType,
  });

  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className="min-h-screen bg-kasi-cream px-4 py-6">
      <AutoRefresh intervalMs={10000} />

      <div className="mx-auto max-w-4xl space-y-5">
        <header className="overflow-hidden rounded-4xl border border-black/10 bg-white shadow-sm">
          <div className="h-2 bg-linear-to-r from-kasi-green via-street-orange to-golden-yellow" />

          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                Tracking order #{shortId}
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
                {order.store.name}
              </h1>

              <p className="mt-2 text-sm font-medium text-black/60">
                Placed on {formatDateTime(order.createdAt)}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <StatusPill status={order.status} />

              <span className="rounded-full bg-kasi-cream px-3 py-1 text-[11px] font-black uppercase tracking-wide text-black/50">
                {isCollection ? "Collection" : "Delivery"}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Current status
            </p>

            <h2 className="mt-2 text-2xl font-black text-kasi-black">
              {humanizeStatus(order.status)}
            </h2>

            {statusMessage && (
              <p className="mt-2 text-sm font-medium leading-6 text-black/60">
                {statusMessage}
              </p>
            )}

            <div className="mt-5 rounded-3xl bg-kasi-cream p-4">
              <p className="text-xs font-black uppercase tracking-wide text-black/45">
                Estimated ready time
              </p>

              <p className="mt-1 text-2xl font-black text-kasi-black">
                {formatTime(order.estimatedReadyAt)}
              </p>
            </div>
          </div>

          <div className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              {isCollection ? "Collection details" : "Delivery details"}
            </p>

            <h2 className="mt-2 text-xl font-black text-kasi-black">
              {isCollection ? "Collect at store" : "Delivery order"}
            </h2>

            {isCollection ? (
              <div className="mt-4 rounded-3xl bg-kasi-cream p-4">
                <p className="text-xs font-black uppercase tracking-wide text-black/45">
                  Store address
                </p>

                <p className="mt-1 whitespace-pre-line text-sm font-bold leading-6 text-black/65">
                  {order.store.address || "Store address not available"}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-3xl bg-kasi-cream p-4">
                <p className="text-xs font-black uppercase tracking-wide text-black/45">
                  Delivery address
                </p>

                <p className="mt-1 whitespace-pre-line text-sm font-bold leading-6 text-black/65">
                  {order.deliveryAddress || "Delivery address not available"}
                </p>

                <p className="mt-3 text-xs font-medium leading-5 text-black/50">
                  Keep your phone on so the driver can contact you if needed.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                {isCollection ? "Pickup code" : "Delivery code"}
              </p>

              <h2 className="mt-1 text-xl font-black text-kasi-black">
                {showCode ? "Use this code to confirm" : "Code not ready yet"}
              </h2>
            </div>

            {showCode && (
              <div className="rounded-3xl bg-kasi-black px-6 py-4 text-center text-white">
                <p className="font-mono text-3xl font-black tracking-[0.24em]">
                  {order.pickupCode}
                </p>
              </div>
            )}
          </div>

          <p className="mt-4 text-sm font-medium leading-6 text-black/60">
            {showCode
              ? isCollection
                ? "Give this code to the store when you collect your order."
                : "Give this code to the driver when your order arrives."
              : isCollection
                ? "Your pickup code will appear once the store marks your order as ready for collection."
                : "Your delivery code will appear once the order is out for delivery."}
          </p>
        </section>

        <section className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                Order summary
              </p>

              <h2 className="mt-1 text-2xl font-black text-kasi-black">
                Items
              </h2>
            </div>

            <p className="text-xs font-black uppercase tracking-wide text-black/45">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </p>
          </div>

          <ul className="mt-4 divide-y divide-black/10">
            {order.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-black text-kasi-black">
                    {item.quantity}× {item.name}
                  </p>

                  <p className="mt-1 text-xs font-medium text-black/50">
                    {formatPrice(item.unitCents)} each
                  </p>
                </div>

                <p className="shrink-0 text-sm font-black text-kasi-black">
                  {formatPrice(item.totalCents)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-3xl bg-kasi-cream p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-black text-kasi-black">Total</span>
              <span className="text-2xl font-black text-kasi-green">
                {formatPrice(order.totalCents)}
              </span>
            </div>
          </div>

          {order.note && order.note.trim() !== "" && (
            <div className="mt-4 rounded-3xl bg-kasi-cream p-4">
              <p className="text-xs font-black uppercase tracking-wide text-black/45">
                Notes / sauces / spice
              </p>

              <p className="mt-1 whitespace-pre-line text-sm font-medium leading-6 text-black/65">
                {order.note}
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}