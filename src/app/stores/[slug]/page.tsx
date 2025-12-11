import { prisma } from "@/lib/prisma";
import { StoreHeader } from "@/components/StoreHeader";
import type { Metadata } from "next";
import { StoreMenuClient } from "./StoreMenuClient";

type StorePageRouteParams = {
  slug: string;
};

export async function generateMetadata(
  { params }: { params: Promise<StorePageRouteParams> }
): Promise<Metadata> {
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

  // If the store doesn't exist, keep it out of the index
  if (!store) {
    return {
      title: "Store not found",
      description:
        "This kasi food spot could not be found on Kasi Flavors.",
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
  const baseTitle = locationLabel
    ? `${name} in ${locationLabel}`
    : name;

  const metaDescription =
    description && description.trim().length > 40
      ? description.slice(0, 155)
      : `Order from ${name} in ${locationLabel || "your area"} on Kasi Flavors. Browse the full menu and place your kasi food order online for collection or delivery.`;

  const urlPath = `/stores/${slug}`;

  return {
    title: baseTitle, // becomes "Store Name in Area, City | Kasi Flavors" via root template
    description: metaDescription,
    alternates: {
      canonical: urlPath,
    },
    openGraph: {
      type: "website",
      title: `${baseTitle} | Kasi Flavors`,
      description: metaDescription,
      url: urlPath,
      // If you later add a store hero image, plug it in here:
      // images: [{ url: store.heroImageUrl, width: 1200, height: 630, alt: `${name} in ${locationLabel} on Kasi Flavors` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${baseTitle} | Kasi Flavors`,
      description: metaDescription,
      // images: store.heroImageUrl ? [store.heroImageUrl] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': "large",
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

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
