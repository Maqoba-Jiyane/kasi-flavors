import { prisma } from "@/lib/prisma";
import { StoreHeader } from "@/components/StoreHeader";
import type { Metadata } from "next";
import { StoreMenuClient } from "./StoreMenuClient";
import { applyPriceAdjustment } from "@/lib/pricing";
import { getStoreMenuCached } from "@/lib/stores/getStoreMenu";

type StorePageRouteParams = {
  slug: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<StorePageRouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;

  const store = await prisma.store.findUnique({
    where: { slug },
    select: {
      name: true,
      area: true,
      city: true,
      description: true,
    },
  });

  if (!store) {
    return {
      title: "Store not found",
      description: "This kasi food spot could not be found on Kasi Flavors.",
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
  }

  const { name, area, city, description } = store;

  const locationLabel = [area, city].filter(Boolean).join(", ");
  const baseTitle = locationLabel ? `${name} in ${locationLabel}` : name;

  const metaDescription =
    description && description.trim().length > 40
      ? description.slice(0, 155)
      : `Order from ${name} in ${
          locationLabel || "your area"
        } on Kasi Flavors. Browse the full menu and place your kasi food order online for collection or delivery.`;

  const urlPath = `/stores/${slug}`;

  return {
    title: baseTitle,
    description: metaDescription,
    alternates: {
      canonical: urlPath,
    },
    openGraph: {
      type: "website",
      title: `${baseTitle} | Kasi Flavors`,
      description: metaDescription,
      url: urlPath,
    },
    twitter: {
      card: "summary_large_image",
      title: `${baseTitle} | Kasi Flavors`,
      description: metaDescription,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

type StorePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;

  const store = await getStoreMenuCached(slug);

  if (!store) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-kasi-cream px-4">
        <div className="rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">🍔</p>
          <h1 className="mt-4 text-2xl font-black text-kasi-black">
            Store not found
          </h1>
          <p className="mt-2 text-sm font-medium text-black/60">
            This kasi food spot could not be found.
          </p>
        </div>
      </main>
    );
  }

  const products = await prisma.product.findMany({
    where: {
      storeId: store.id,
      isAvailable: true,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [
      {
        category: {
          sortOrder: "asc",
        },
      },
      {
        name: "asc",
      },
    ],
  });

  const storeAny = store as any;

  const mappedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description ?? undefined,

    categoryId: product.categoryId ?? undefined,
    categoryName: product.category?.name ?? "Menu",
    categorySortOrder: product.category?.sortOrder ?? 999,

    priceCents: applyPriceAdjustment(
      product.priceCents,
      product.priceAdjustmentEnabled,
      product.priceAdjustmentPercent,
    ),
    imageUrl: product.imageUrl ?? undefined,
    isAvailable: product.isAvailable,
  }));

  return (
    <main className="min-h-screen bg-kasi-cream pb-28">
      <StoreHeader
        name={store.name}
        area={store.area}
        city={store.city}
        isOpen={store.isOpen}
        avgPrepTimeMinutes={store.avgPrepTimeMinutes}
        priceAdjustmentEnabled={storeAny.priceAdjustmentEnabled}
        priceAdjustmentPercent={storeAny.priceAdjustmentPercent}
      />

      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Full menu
            </p>
            <h2 className="text-3xl font-black tracking-tight text-kasi-black">
              Choose your meal
            </h2>
            <p className="mt-1 text-sm font-medium text-black/55">
              Add your favourites to cart and checkout when ready.
            </p>
          </div>

          <div className="rounded-full bg-kasi-black px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
            {mappedProducts.length}{" "}
            {mappedProducts.length === 1 ? "item" : "items"} available
          </div>
        </div>

        <StoreMenuClient storeSlug={store.slug} products={mappedProducts} />
      </section>
    </main>
  );
}
