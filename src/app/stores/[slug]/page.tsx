import { prisma } from "@/lib/prisma";
import { StoreHeader } from "@/components/StoreHeader";
import { StoreMenuClient } from "./StoreMenuClient";

type StorePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;
  
  const store = await prisma.store.findUnique({
    where: { slug },
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

  const products = await prisma.product.findMany({
    where: { storeId: store.id, isAvailable: true },
    orderBy: { createdAt: "asc" },
  });

  const mappedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    priceCents: p.priceCents,
    imageUrl: p.imageUrl ?? undefined,
    isAvailable: p.isAvailable,
  }));

  return (
    <main className="min-h-screen bg-slate-50 pb-20 dark:bg-slate-950">
      <StoreHeader
        name={store.name}
        area={store.area}
        city={store.city}
        isOpen={store.isOpen}
        avgPrepTimeMinutes={store.avgPrepTimeMinutes}
      />

      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        <StoreMenuClient storeSlug={store.slug} products={mappedProducts} />
      </div>
    </main>
  );
}
