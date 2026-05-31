// app/(public)/checkout/page.tsx
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ClipboardList, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserMinimal } from "@/lib/auth";
import { getCartForUser, calculateCartTotals, formatPrice } from "@/lib/cart";
import { CheckoutForm } from "@/components/CheckoutForm";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  description:
    "Confirm your order details and complete checkout for your kasi food from Kasi Flavors.",
  alternates: {
    canonical: "/checkout",
  },
  openGraph: {
    type: "website",
    title: "Checkout | Kasi Flavors",
    description:
      "Review your kasi food order and securely complete checkout with Kasi Flavors.",
    url: "/checkout",
  },
  twitter: {
    card: "summary",
    title: "Checkout | Kasi Flavors",
    description:
      "Confirm your kasi food order details and complete checkout with Kasi Flavors.",
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

interface CheckoutPageProps {
  searchParams?: Promise<{
    storeId?: string;
  }>;
}

function CheckoutNotice({
  title,
  message,
  href = "/",
  cta = "Browse stores",
}: {
  title: string;
  message: string;
  href?: string;
  cta?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-kasi-cream px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-kasi-black text-golden-yellow">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="mt-5 text-2xl font-black text-kasi-black">{title}</h1>

        <p className="mt-2 text-sm font-medium leading-6 text-black/60">
          {message}
        </p>

        <Link href={href} className="mt-6 inline-flex kf-btn-primary">
          {cta}
        </Link>
      </div>
    </main>
  );
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const user = await getCurrentUserMinimal();

  if (!user) {
    redirect("/sign-in?redirectUrl=/checkout");
  }

  const queryStoreIdParams = await searchParams;
  const queryStoreId = queryStoreIdParams?.storeId;

  const cart = await getCartForUser(user.id);

  if (!cart.items.length || !cart.storeId) {
    return (
      <CheckoutNotice
        title="Your cart is empty"
        message="Please add items from a local kasi food spot before checking out."
        href="/"
        cta="Browse stores"
      />
    );
  }

  if (queryStoreId && queryStoreId !== cart.storeId) {
    return (
      <CheckoutNotice
        title="Store mismatch"
        message="The store in your cart does not match the selected store. Please go back and try again."
        href="/cart"
        cta="Back to cart"
      />
    );
  }

  const storeId = cart.storeId;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    return (
      <CheckoutNotice
        title="Store not found"
        message="We could not find the store linked to this order. Please go back and try again."
        href="/cart"
        cta="Back to cart"
      />
    );
  }

  const storeAny = store as any;

  const lineItems = cart.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    unitCents: item.priceCents,
    totalCents: item.priceCents * item.quantity,
  }));

  const { subtotalCents } = calculateCartTotals(cart);
  const totalFormatted = formatPrice(subtotalCents);

  const itemsForPayload = lineItems.map((li) => ({
    productId: li.productId,
    quantity: li.quantity,
  }));

  return (
    <main className="min-h-screen bg-kasi-cream px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:bg-golden-yellow"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cart
        </Link>

        <header className="mt-6 overflow-hidden rounded-[2rem] bg-kasi-black text-white shadow-sm">
          <div className="relative px-5 py-8 sm:px-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-street-orange blur-3xl opacity-40" />
            <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-kasi-green blur-3xl opacity-40" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                  Final step
                </p>

                <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                  Checkout
                </h1>

                <p className="mt-3 text-sm font-medium text-white/65">
                  {store.name} · {store.area}, {store.city}
                </p>

                {storeAny.priceAdjustmentEnabled && (
                  <p className="mt-2 inline-flex rounded-full bg-golden-yellow px-3 py-1 text-xs font-black uppercase tracking-wide text-kasi-black">
                    {storeAny.priceAdjustmentPercent > 0
                      ? `Prices include a ${storeAny.priceAdjustmentPercent}% markup`
                      : `Prices include a ${Math.abs(
                          storeAny.priceAdjustmentPercent
                        )}% discount`}
                  </p>
                )}
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5">
                <p className="text-sm font-black uppercase tracking-wide text-golden-yellow">
                  Order total
                </p>
                <p className="mt-2 text-4xl font-black">{totalFormatted}</p>
                <p className="mt-2 text-xs font-medium text-white/60">
                  Confirm your details below.
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_390px]">
          {/* Checkout form */}
          <section className="rounded-[2rem] border border-black/10 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kasi-green text-white">
                <ClipboardList className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                  Your details
                </p>
                <h2 className="text-xl font-black text-kasi-black">
                  Complete your order
                </h2>
              </div>
            </div>

            <CheckoutForm
              storeId={storeId}
              itemsJson={JSON.stringify(itemsForPayload)}
              totalFormatted={totalFormatted}
              user={user}
              deliveryFeeCents={store.deliveryFeeCents ?? undefined}
              deliveryRadiusKm={store.deliveryRadiusKm ?? undefined}
              onlinePaymentsEnabled={store.onlinePaymentsEnabled}
              cashOnCollectionEnabled={store.cashOnCollectionEnabled}
              supportsDelivery={store.supportsDelivery}
            />
          </section>

          {/* Order summary */}
          <aside className="h-fit rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm lg:sticky lg:top-28">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kasi-black text-golden-yellow">
                <ShoppingBag className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                  Order summary
                </p>
                <h2 className="text-xl font-black text-kasi-black">
                  Your food
                </h2>
              </div>
            </div>

            <ul className="mt-6 space-y-3">
              {lineItems.map((li) => (
                <li
                  key={li.productId}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-kasi-cream p-3"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-black text-kasi-black">
                      {li.quantity}x {li.name}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wide text-black/45">
                      {formatPrice(li.unitCents)} each
                    </p>
                  </div>

                  <span className="shrink-0 text-sm font-black text-kasi-black">
                    {formatPrice(li.totalCents)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-5 border-t border-black/10 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-black/55">
                  Subtotal
                </span>
                <span className="text-2xl font-black text-kasi-black">
                  {totalFormatted}
                </span>
              </div>

              <p className="mt-4 rounded-3xl bg-kasi-black p-4 text-xs font-medium leading-5 text-white/65">
                You’ll choose collection or delivery in the form. Delivery fees,
                where available, are handled during checkout.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}