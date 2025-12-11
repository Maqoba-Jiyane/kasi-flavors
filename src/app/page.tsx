import { prisma } from "@/lib/prisma";
import { StoreCard } from "@/components/StoreCard";
import { getCurrentUserMinimal } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order kasi food online", // becomes "Order kasi food online | Kasi Flavors" via root template
  description:
    "Discover local kasi spots near you. Order kota, bunny chow, shisanyama and more for collection or delivery from your favourite township kitchens.",
  alternates: {
    canonical: "/", // home canonical
  },
  openGraph: {
    type: "website",
    title: "Order kasi food online | Kasi Flavors",
    description:
      "Browse kasi restaurants by area and city. Order kota, bunny chow, shisanyama and more for collection or delivery in your neighbourhood.",
    url: "/",
    images: [
      {
        url: "/og-image-home.png", // optional: use a home-specific hero, else fallback to the global /og-image.png
        width: 1200,
        height: 630,
        alt: "Kasi Flavors home – browse kasi spots and order online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Order kasi food online | Kasi Flavors",
    description:
      "Find nearby kasi spots and order kota, bunny chow, shisanyama and more for quick collection or delivery.",
    images: ["/og-image-home.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HomePage() {

  const stores = await prisma.store.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      area: true,
      city: true,
      description: true,
      avgPrepTimeMinutes: true,
      isOpen: true
    }
  });

  const user = await getCurrentUserMinimal();

  // If store owner, don't allow them to see the customer homepage.
  if (user?.role === "STORE_OWNER") {
    redirect("/owner/store/orders");
  }

  const mapped = stores.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    area: s.area,
    city: s.city,
    description: s.description ?? undefined,
    avgPrepTimeMinutes: s.avgPrepTimeMinutes,
    isOpen: s.isOpen,
  }));

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex justify-between">
          <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Kasi Flavors
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Order from your favourite kasi spots – kota, bunny chow, all
            in one place.
          </p>
          </div>
        </header>

        <section>
          {mapped.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">
              No stores yet. Seed your database with a few demo stores.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mapped.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
