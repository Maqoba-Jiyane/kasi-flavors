// app/(public)/checkout/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUserMinimal } from "@/lib/auth";
import { getCartForUser, calculateCartTotals, formatPrice } from "@/lib/cart";
import { CheckoutForm } from "@/components/CheckoutForm";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout", // becomes "Checkout | Kasi Flavors" via root template
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
    follow: false, // internal, auth-only step
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

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const user = await getCurrentUserMinimal();

  // Require auth for checkout
  if (!user) {
    redirect("/sign-in?redirectUrl=/checkout");
  }

  const queryStoreIdParams = await searchParams

  const queryStoreId = queryStoreIdParams?.storeId

  // Load cart from DB
  const cart = await getCartForUser(user.id);

  if (!cart.items.length || !cart.storeId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your cart is empty. Please add items before checking out.
        </p>
      </main>
    );
  }

  // If a storeId is provided in the URL, it must match the cart's storeId
  if (queryStoreId && queryStoreId !== cart.storeId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          The store in your cart does not match the selected store. Please go back and try again.
        </p>
      </main>
    );
  }

  const storeId = cart.storeId;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Store not found. Please go back and try again.
        </p>
      </main>
    );
  }

  // Build line items from the DB-backed cart
  const lineItems = cart.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    quantity: item.quantity,
    unitCents: item.priceCents,
    totalCents: item.priceCents * item.quantity,
  }));

  const { subtotalCents } = calculateCartTotals(cart);
  const totalFormatted = formatPrice(subtotalCents);

  // This is what we pass to the POST API; still { productId, quantity }[]
  const itemsForPayload = lineItems.map((li) => ({
    productId: li.productId,
    quantity: li.quantity,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          Checkout
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
          {store.name} · {store.area}, {store.city}
        </p>

        {/* Order summary */}
        <section className="mt-4 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950/40">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
            Order summary
          </h2>
          <ul className="space-y-1">
            {lineItems.map((li) => (
              <li
                key={li.productId}
                className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200"
              >
                <span>
                  {li.quantity}x {li.name}
                </span>
                <span>{formatPrice(li.totalCents)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-50">
            <span>Total</span>
            <span>{totalFormatted}</span>
          </div>
        </section>

        {/* Checkout form */}
        <CheckoutForm
          storeId={storeId}
          itemsJson={JSON.stringify(itemsForPayload)}
          totalFormatted={totalFormatted}
          user={user}
        />
      </div>
    </main>
  );
}
