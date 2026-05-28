import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminProductPriceManager } from "@/components/admin/AdminProductPriceManager";

export default async function AdminStoreProductsPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const user = await getCurrentUser();
  assertRole(user, ["ADMIN"]);

  const { storeId } = await params;

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      slug: true,
      products: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          priceCents: true,
          isAvailable: true,
          priceAdjustmentEnabled: true,
          priceAdjustmentPercent: true,
        },
      },
    },
  });

  if (!store) return notFound();

  return (
    <main className="space-y-5">
      <header className="rounded-4xl border border-black/10 bg-white p-5 shadow-sm">
        <Link
          href={`/admin/stores/${store.id}`}
          className="inline-flex rounded-full border-2 border-black/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-kasi-black transition hover:border-kasi-green hover:text-kasi-green"
        >
          ← Back to store
        </Link>

        <p className="mt-5 text-xs font-black uppercase tracking-wide text-street-orange">
          Product pricing
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-kasi-black">
          {store.name}
        </h1>

        <p className="mt-2 text-sm font-medium leading-6 text-black/60">
          Manage discounts and pricing adjustments for this store’s menu.
        </p>
      </header>

      <AdminProductPriceManager storeId={store.id} products={store.products} />
    </main>
  );
}