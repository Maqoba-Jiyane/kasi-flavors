import { prisma } from "@/lib/prisma";
import { CheckoutForm } from "@/components/CheckoutForm";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

interface CheckoutPageProps {
  searchParams: Promise<{
    storeId?: string;
    items?: string;
  }>;
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const { items, storeId } = await searchParams;
  const itemsParam = items;

  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in?redirectUrl=/cart')
  }

  console.log("storeId: ", storeId)

  if (!storeId || !itemsParam) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No cart data. Please go back to the store and try again.
        </p>
      </main>
    );
  }

  let parsedItems: { productId: string; quantity: number }[] = [];
  try {
    parsedItems = JSON.parse(decodeURIComponent(itemsParam));
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Could not read your cart. Please go back and try again.
        </p>
      </main>
    );
  }

  if (parsedItems.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Your cart is empty.
        </p>
      </main>
    );
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  if (!store) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Store not found.
        </p>
      </main>
    );
  }

  const productIds = parsedItems.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, storeId: store.id },
  });

  const lineItems = parsedItems.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      product,
      quantity: item.quantity,
    };
  });

  const totalCents = lineItems.reduce((sum, li) => {
    if (!li.product) return sum;
    return sum + li.product.priceCents * li.quantity;
  }, 0);

  const totalFormatted = `R ${(totalCents / 100).toFixed(2)}`;

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
            {lineItems.map((li, idx) =>
              li.product ? (
                <li
                  key={li.product.id + idx}
                  className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-200"
                >
                  <span>
                    {li.quantity}x {li.product.name}
                  </span>
                  <span>
                    R {((li.product.priceCents * li.quantity) / 100).toFixed(2)}
                  </span>
                </li>
              ) : null
            )}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-50">
            <span>Total</span>
            <span>{totalFormatted}</span>
          </div>
        </section>

        {/* Checkout form */}
        <CheckoutForm
          storeId={storeId}
          itemsJson={JSON.stringify(parsedItems)}
          totalFormatted={totalFormatted}
        />
      </div>
    </main>
  );
}
