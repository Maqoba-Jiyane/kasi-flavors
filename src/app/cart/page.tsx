// app/(public)/cart/page.tsx
import {
    readCartFromCookies,
    calculateCartTotals,
    formatPrice,
  } from "@/lib/cart";
  import {
    updateCartItem,
    removeCartItem,
    clearCart,
  } from "./actions";
  import Link from "next/link";
import { Trash2 } from "lucide-react";
  
  export default async function CartPage() {
    const cart = await readCartFromCookies();
    const { itemCount, subtotalCents } = calculateCartTotals(cart);
  
    const hasItems = cart.items.length > 0;

    const itemsParam = encodeURIComponent(JSON.stringify(cart.items));
    const route = `/checkout?storeId=${cart.storeId}&items=${itemsParam}`;
  
    return (
      <div className="space-y-6 min-h-screen px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-950">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
              Your cart
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              {hasItems
                ? `${itemCount} item${itemCount === 1 ? "" : "s"} in your order.`
                : "No items yet. Browse a store to start your order."}
            </p>
          </div>
  
          {hasItems && (
            <form action={clearCart}>
              <button
                type="submit"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
              >
                Clear cart
              </button>
            </form>
          )}
        </header>
  
        {!hasItems && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Your cart is empty.
            <div className="mt-3">
              <Link
                href="/"
                className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Browse stores
              </Link>
            </div>
          </div>
        )}
  
        {hasItems && (
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            {/* Items */}
            <section className="space-y-3">
              {cart.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatPrice(item.priceCents)} each
                    </p>
  
                    {/* Quantity form */}
                    <form
                      action={updateCartItem}
                      className="mt-2 inline-flex items-center gap-2 text-xs"
                    >
                      <input
                        type="hidden"
                        name="productId"
                        value={item.productId}
                      />
                      <label className="text-slate-500 dark:text-slate-400">
                        Qty:
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        min={0}
                        defaultValue={item.quantity}
                        className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      >
                        Update
                      </button>
                    </form>
                  </div>
  
                  <div className="flex flex-col items-end justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
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
                        className="text-[11px] font-medium text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <Trash2 />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </section>
  
            {/* Summary */}
            <aside className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Order summary
              </h2>
  
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">
                    Subtotal
                  </dt>
                  <dd className="font-semibold text-slate-900 dark:text-slate-50">
                    {formatPrice(subtotalCents)}
                  </dd>
                </div>
                {/* For now, no delivery fee / service fee in MVP */}
              </dl>
  
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                You’ll choose <strong>collection / delivery</strong> and enter your
                address on the next step.
              </p>
  
              <Link
                href={`${route}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Continue to checkout
              </Link>
            </aside>
          </div>
        )}
      </div>
    );
  }
  