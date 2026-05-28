// app/(public)/cart/page.tsx
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Trash2 } from "lucide-react";

import { getCartForUser, calculateCartTotals, formatPrice } from "@/lib/cart";
import { updateCartItem, removeCartItem, clearCart } from "./actions";
import { getCurrentUserMinimal } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Your cart",
  description:
    "Review your kasi food order, update quantities, and get ready to checkout with Kasi Flavors.",
  alternates: {
    canonical: "/cart",
  },
  openGraph: {
    type: "website",
    title: "Your cart | Kasi Flavors",
    description:
      "Review the items in your Kasi Flavors cart before completing your order.",
    url: "/cart",
  },
  twitter: {
    card: "summary",
    title: "Your cart | Kasi Flavors",
    description:
      "Check your kasi food order and get ready to checkout with Kasi Flavors.",
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

export default async function CartPage() {
  const user = await getCurrentUserMinimal();

  if (!user) {
    redirect("/sign-in?redirectUrl=/cart");
  }

  const cart = await getCartForUser(user.id);
  const { itemCount, subtotalCents } = calculateCartTotals(cart);

  const hasItems = cart.items.length > 0;

  const storeId = cart.storeId?.trim() || null;
  const hasValidStoreId = !!storeId && /^[a-f\d]{24}$/i.test(storeId);

  const route = hasValidStoreId ? `/checkout?storeId=${storeId}` : "/";

  const store = hasValidStoreId
    ? await prisma.store.findUnique({
        where: { id: storeId },
        select: {
          id: true,
          name: true,
          slug: true,
          isOpen: true,
          approvalStatus: true,
        },
      })
    : null;

  return (
    <main className="min-h-screen bg-kasi-cream px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:bg-golden-yellow"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to stores
        </Link>

        <header className="mt-6 overflow-hidden rounded-4xl bg-kasi-black text-white shadow-sm">
          <div className="relative px-5 py-8 sm:px-8">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-street-orange blur-3xl opacity-40" />
            <div className="absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-kasi-green blur-3xl opacity-40" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                  Your order
                </p>

                <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
                  Your cart
                </h1>

                <p className="mt-3 text-sm font-medium text-white/65">
                  {hasItems
                    ? `${itemCount} item${
                        itemCount === 1 ? "" : "s"
                      } in your order. Review before checkout.`
                    : "No items yet. Browse a store to start your order."}
                </p>
              </div>

              {hasItems && (
                <form action={clearCart}>
                  <button
                    type="submit"
                    className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-street-orange"
                  >
                    Clear cart
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>

        {!hasItems && (
          <section className="mt-6 rounded-4xl border border-dashed border-black/15 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-kasi-black text-3xl">
              🛒
            </div>

            <h2 className="mt-5 text-2xl font-black text-kasi-black">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/60">
              Find a local kasi food spot, add your favourites, and checkout
              when you are ready.
            </p>

            <div className="mt-6">
              <Link href="/" className="inline-flex kf-btn-primary">
                Browse stores
              </Link>
            </div>
          </section>
        )}

        {hasItems && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Items */}
            <section className="space-y-3">
              {cart.items.map((item) => (
                <div
                  key={item.productId}
                  className="rounded-[1.75rem] border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-kasi-black text-2xl">
                        🍟
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-base font-black text-kasi-black">
                          {item.name}
                        </p>

                        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-black/45">
                          {formatPrice(item.priceCents)} each
                        </p>

                        <form
                          action={updateCartItem}
                          className="mt-4 flex flex-wrap items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name="productId"
                            value={item.productId}
                          />

                          <label className="text-xs font-black uppercase tracking-wide text-black/50">
                            Qty
                          </label>

                          <input
                            type="number"
                            name="quantity"
                            min={0}
                            defaultValue={item.quantity}
                            className="w-20 rounded-full border-2 border-black/10 bg-kasi-cream px-3 py-2 text-center text-sm font-black text-kasi-black outline-none focus:border-kasi-green focus:ring-2 focus:ring-kasi-green/20"
                          />

                          <button
                            type="submit"
                            className="rounded-full bg-kasi-black px-4 py-2 text-xs font-black text-white transition hover:bg-street-orange"
                          >
                            Update
                          </button>
                        </form>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end justify-between gap-4">
                      <p className="rounded-full bg-golden-yellow px-3 py-1.5 text-sm font-black text-kasi-black">
                        {formatPrice(item.priceCents * item.quantity)}
                      </p>

                      <form action={removeCartItem}>
                        <input
                          type="hidden"
                          name="productId"
                          value={item.productId}
                        />

                        <button
                          type="submit"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 transition hover:bg-red-500 hover:text-white"
                          aria-label={`Remove ${item.name} from cart`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Summary */}
            <aside className="h-fit rounded-4xl border border-black/10 bg-white p-5 shadow-sm lg:sticky lg:top-28">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kasi-green text-white">
                  <ShoppingBag className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                    Order summary
                  </p>
                  <h2 className="text-xl font-black text-kasi-black">
                    Checkout details
                  </h2>
                </div>
              </div>

              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between border-b border-black/10 pb-4">
                  <dt className="font-bold text-black/55">Items</dt>
                  <dd className="font-black text-kasi-black">
                    {itemCount} item{itemCount === 1 ? "" : "s"}
                  </dd>
                </div>

                <div className="flex items-center justify-between">
                  <dt className="font-bold text-black/55">Subtotal</dt>
                  <dd className="text-2xl font-black text-kasi-black">
                    {formatPrice(subtotalCents)}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 rounded-3xl bg-kasi-cream p-4">
                <p className="text-xs font-black uppercase tracking-wide text-kasi-black">
                  Next step
                </p>
                <p className="mt-1 text-xs font-medium leading-5 text-black/60">
                  You’ll choose collection or delivery and enter your details on
                  the checkout page.
                </p>
              </div>

              <Link
                href={route}
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-kasi-green px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-street-orange"
              >
                Continue to checkout →
              </Link>

              <Link
                href={`/stores/${store?.slug ?? ""}`}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full border-2 border-black/10 bg-white px-5 py-3 text-sm font-black text-kasi-black transition hover:border-kasi-black"
              >
                Add more food
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
