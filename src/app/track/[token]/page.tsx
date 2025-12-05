// app/track/[token]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AutoRefresh } from "./AutoRefresh";

type TrackPageProps = {
  params: Promise<{ token: string }>;
};

function formatPrice(priceCents: number) {
  return `R ${(priceCents / 100).toFixed(2)}`;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(d: Date) {
  return d.toLocaleString("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusMessage(args: {
  status: string;
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

export default async function TrackOrderPage({ params }: TrackPageProps) {
  const {token} = await params;

  console.log('track token: ', token)

  const order = await prisma.order.findUnique({
    where: { trackingToken: token },
    include: {
      items: true,
      store: true,
    },
  });

  if (!order) {
    console.log('track token: not found')
    notFound();
  }

  const etaText = order.estimatedReadyAt
    ? formatTime(order.estimatedReadyAt)
    : null;

  const statusMessage = getStatusMessage({
    status: order.status,
    fulfilmentType: order.fulfilmentType,
  });

  const shortId = order.id.slice(-6);
  const isCollection = order.fulfilmentType === "COLLECTION";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
      {/* Auto-refresh every 10 seconds */}
      <AutoRefresh intervalMs={10000} />

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {/* Header / Hero card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Tracking order
              </p>
              <h1 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                #{shortId} · {order.store.name}
              </h1>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                Placed on {formatDateTime(order.createdAt)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={order.status} />
              {etaText && (
                <p className="text-[11px] text-slate-500 dark:text-slate-300">
                  Estimated ready around{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {etaText}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Status message */}
          {statusMessage && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
              {statusMessage}
            </div>
          )}

          {/* Pickup / delivery code */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-3 text-slate-100 shadow-sm dark:border-slate-700">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-300">
                {isCollection ? "Collection code" : "Delivery code"}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-[0.3em]">
                {order.pickupCode}
              </p>
              <p className="mt-2 text-[11px] text-slate-300">
                {isCollection
                  ? "Give this code to the store when you collect your order."
                  : "Give this code to the driver when your order arrives."}
              </p>
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Fulfilment
              </p>
              <p className="mt-1 font-medium">
                {isCollection ? "Collection at store" : "Delivery"}
              </p>
              {isCollection ? (
                <p className="mt-1 text-[11px]">
                  Store address:{" "}
                  <span className="font-medium">
                    {order.store.address}
                  </span>
                </p>
              ) : (
                <>
                  {order.deliveryAddress && (
                    <p className="mt-1 text-[11px]">
                      Delivery address:{" "}
                      <span className="font-medium">
                        {order.deliveryAddress}
                      </span>
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Make sure your phone is on so the driver can contact you if
                    needed.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Items + totals */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Items
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            What you ordered.
          </p>

          <div className="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-slate-900 dark:text-slate-50">
                    {item.quantity}× {item.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-900 dark:text-slate-50">
                    {formatPrice(item.totalCents)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              Total
            </span>
            <span className="text-base font-semibold text-slate-900 dark:text-slate-50">
              {formatPrice(order.totalCents)}
            </span>
          </div>

          {/* Notes */}
          {order.note && order.note.trim() !== "" && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Notes / sauces / spice
              </p>
              <p className="mt-1 whitespace-pre-line">{order.note}</p>
            </div>
          )}
        </section>

        {/* Customer info (optional lightweight section) */}
        {/* <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Contact details
          </h2>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            These details were provided when the order was placed.
          </p>

          <div className="mt-3 space-y-1 text-slate-700 dark:text-slate-200">
            <p>
              <span className="font-medium">Name:</span> {order.customerName}
            </p>
            <p>
              <span className="font-medium">Phone:</span> {order.customerPhone}
            </p>
            {order.customerEmail && (
              <p>
                <span className="font-medium">Email:</span>{" "}
                {order.customerEmail}
              </p>
            )}
          </div>
        </section> */}
      </div>
    </main>
  );
}
