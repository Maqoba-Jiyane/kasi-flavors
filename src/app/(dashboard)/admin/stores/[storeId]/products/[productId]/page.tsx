// app/(dashboard)/admin/stores/[storeId]/products/[productId]/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface EditProductPageProps {
  params: Promise<{ storeId: string; productId: string }>;
}

async function updateProduct(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const productId = formData.get("productId") as string | null;
  const name = (formData.get("name") as string | "").trim();
  const priceStr = (formData.get("price") as string | "").trim();
  const description = (formData.get("description") as string | "").trim();
  const adjEnabled = formData.get("priceAdjustmentEnabled") === "on";
  const adjPercent = Number(formData.get("priceAdjustmentPercent") || 0);

  if (!productId || !name || !priceStr) {
    throw new Error("Missing required fields");
  }

  const price = Number(priceStr);
  if (Number.isNaN(price) || price <= 0) {
    throw new Error("Invalid price");
  }

  const roundedPrice = Math.round(price * 2) / 2;
  const priceCents = Math.round(roundedPrice * 100);

  await prisma.product.update({
    where: { id: productId },
    data: {
      name,
      description: description || null,
      priceCents,
      priceAdjustmentEnabled: adjEnabled,
      priceAdjustmentPercent: adjPercent,
    },
  });

  // the storeId is included in the form so we can redirect/refresh
  const storeId = formData.get("storeId") as string;
  revalidatePath(`/admin/stores/${storeId}/products`);
  redirect(`/admin/stores/${storeId}/products`);
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { storeId, productId } = await params;

  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      storeId: true,
      name: true,
      description: true,
      priceCents: true,
      isAvailable: true,
      priceAdjustmentEnabled: true,
      priceAdjustmentPercent: true,
    },
  });

  if (!product || product.storeId !== storeId) {
    throw new Error("Product not found");
  }

  return (
    <main className="max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Edit product</h1>

      <form action={updateProduct} className="space-y-4">
        <input type="hidden" name="productId" value={product.id} />
        <input type="hidden" name="storeId" value={product.storeId} />

        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Name
          </label>
          <input
            name="name"
            required
            defaultValue={product.name}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
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
            defaultValue={(product.priceCents / 100).toFixed(2)}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Description (optional)
          </label>
          <textarea
            name="description"
            rows={2}
            defaultValue={product.description || ""}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
          />
        </div>

        <div className="space-y-1">
          <label className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <input
              name="priceAdjustmentEnabled"
              type="checkbox"
              defaultChecked={product.priceAdjustmentEnabled}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Enable adjustment
          </label>
          <input
            name="priceAdjustmentPercent"
            type="number"
            step="0.01"
            defaultValue={product.priceAdjustmentPercent || 0}
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
            placeholder="Percent (e.g. 10 or -25)"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
        >
          Save changes
        </button>
      </form>
    </main>
  );
}
