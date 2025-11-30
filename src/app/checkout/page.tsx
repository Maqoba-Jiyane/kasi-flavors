import { prisma } from "@/lib/prisma";
import { placeOrderAction } from "./actions";

interface CheckoutPageProps {
  searchParams: Promise<{
    storeSlug?: string;
    items?: string;
  }>;
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const { items, storeSlug } = await searchParams;
  const itemsParam = items;

  if (!storeSlug || !itemsParam) {
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
    where: { slug: storeSlug },
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
        <form
          action={placeOrderAction}
          className="mt-5 space-y-4 text-sm text-slate-900 dark:text-slate-50"
        >
          {/* Hidden fields */}
          <input type="hidden" name="storeSlug" value={storeSlug} />
          <input
            type="hidden"
            name="items"
            value={JSON.stringify(parsedItems)}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Full name
              </label>
              <input
                name="fullName"
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Phone number
              </label>
              <input
                name="phone"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                placeholder="0732926640"
              />
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Email (for confirmation)
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Fulfilment type */}
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Fulfilment
            </label>
            <div className="flex gap-3 text-xs">
              <label className="flex flex-1 cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <span className="flex flex-col">
                  <span className="font-semibold">Collection</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    You&apos;ll collect from the store
                  </span>
                </span>
                <input
                  type="radio"
                  name="fulfilmentType"
                  value="COLLECTION"
                  defaultChecked
                  className="h-4 w-4"
                />
              </label>

              {/* <label className="flex flex-1 cursor-pointer items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                <span className="flex flex-col">
                  <span className="font-semibold">Delivery</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cash on delivery
                  </span>
                </span>
                <input
                  type="radio"
                  name="fulfilmentType"
                  value="DELIVERY"
                  className="h-4 w-4"
                />
              </label> */}
            </div>
          </div>

          {/* Address + note (MVP: always visible, you can add JS to hide/show based on radio later) */}
          {/* <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Delivery address (if delivery)
            </label>
            <textarea
              name="address"
              rows={3}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              placeholder="E.g. Third shack behind XYZ spaza, blue gate, Soweto..."
            />
          </div> */}

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Note to store (optional)
            </label>
            <textarea
              name="note"
              rows={2}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-0 transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-50"
              placeholder="Any extra instructions?"
            />
          </div>

          {/* Payment info (MVP: display only) */}
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950/40 dark:text-slate-300">
            <p className="font-medium">Payment</p>
            <p className="mt-1">
              <span className="font-semibold">Cash on delivery</span> only for
              now. Please have exact cash ready if possible.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Place order
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
