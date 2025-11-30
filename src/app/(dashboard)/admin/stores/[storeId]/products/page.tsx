// app/(dashboard)/admin/stores/[storeId]/products/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatPrice } from "../../../overview/page";

interface StoreProductsPageProps {
  params: Promise<{ storeId: string }>;
}

// Server actions (MVP, same file for now – you can extract later)
async function toggleAvailability(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const productId = formData.get("productId") as string | null;
  const storeId = formData.get("storeId") as string | null;
  const current = formData.get("current") as string | null;

  if (!productId || !storeId || current == null) {
    throw new Error("Invalid form data");
  }

  const isAvailable = current === "true";

  await prisma.product.update({
    where: { id: productId },
    data: { isAvailable: !isAvailable },
  });

  revalidatePath(`/admin/stores/${storeId}/products`);
}

async function createProduct(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const storeId = formData.get("storeId") as string | null;
  const name = (formData.get("name") as string | "").trim();
  const priceStr = (formData.get("price") as string | "").trim();
  const description = (formData.get("description") as string | "").trim();

  if (!storeId || !name || !priceStr) {
    throw new Error("Missing required fields");
  }

  const price = Number(priceStr);
  if (Number.isNaN(price) || price <= 0) {
    throw new Error("Invalid price");
  }

  const priceCents = Math.round(price * 100);

  await prisma.product.create({
    data: {
      storeId,
      name,
      description: description || null,
      priceCents,
      isAvailable: true,
    },
  });

  revalidatePath(`/admin/stores/${storeId}/products`);
  redirect(`/admin/stores/${storeId}/products`);
}

export default async function StoreProductsPage({
  params,
}: StoreProductsPageProps) {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const {storeId} = await params

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { products: { orderBy: { createdAt: "desc" } } },
  });

  if (!store) {
    throw new Error("Store not found");
  }

  const products = store.products;

  return (
    <main className="space-y-5">
      {/* Add product form */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          Add product
        </h2>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
          Quickly add a new item to this store’s menu.
        </p>

        <form action={createProduct} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="storeId" value={store.id} />

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Name
            </label>
            <input
              name="name"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="Classic Kota"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Price (R)
            </label>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="45.00"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Description (optional)
            </label>
            <textarea
              name="description"
              rows={2}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="Describe the item, sauces, extras, etc."
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Save product
            </button>
          </div>
        </form>
      </section>

      {/* Products table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950/40 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Product</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-center font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400"
                >
                  No products yet. Use the form above to add one.
                </td>
              </tr>
            )}

            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2 text-slate-800 dark:text-slate-100">
                  {p.name}
                </td>
                <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                  <span className="line-clamp-2">
                    {p.description || "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-slate-800 dark:text-slate-100">
                  {formatPrice(p.priceCents)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={[
                      "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      p.isAvailable
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    {p.isAvailable ? "Available" : "Hidden"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <form action={toggleAvailability} className="inline">
                    <input type="hidden" name="productId" value={p.id} />
                    <input type="hidden" name="storeId" value={store.id} />
                    <input
                      type="hidden"
                      name="current"
                      value={String(p.isAvailable)}
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      {p.isAvailable ? "Hide" : "Show"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
