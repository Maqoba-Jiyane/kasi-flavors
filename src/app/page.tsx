// app/page.tsx
import { StoreCard } from "@/components/StoreCard";
import { getCurrentUserMinimal } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { distanceKm } from "@/lib/location/distance";
import { LocationSearch } from "@/components/location/LocationSearch";
import { geocodeStoreAddress } from "@/lib/location/geocode";
import {
  getAllCollectionStores,
  getOpenCollectionStores,
} from "@/lib/stores/getCollectionStores";
import { KasiLaunchLanding } from "@/components/launch/KasiLaunchLanding";

export const metadata: Metadata = {
  title: "Order kasi food for collection",
  description:
    "Discover kasi food spots near you. Order kota, chips, bunny chow and more online, then collect when your food is ready.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Order kasi food for collection | Kasi Flavors",
    description:
      "Find nearby kasi food spots, order online, and collect when your meal is ready.",
    url: "/",
    images: [
      {
        url: "/og-image-home.png",
        width: 1200,
        height: 630,
        alt: "Kasi Flavors home – order online and collect",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Order kasi food for collection | Kasi Flavors",
    description:
      "Find nearby kasi spots and order kota, chips, bunny chow and more for collection.",
    images: ["/og-image-home.png"],
  },
  robots: { index: true, follow: true },
};

type SearchParams = {
  lat?: string;
  lng?: string;
  address?: string;
  area?: string;
  city?: string;
  postalCode?: string;
  showFar?: string;
  showClosed?: string;
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUserMinimal();

  if (user?.role === "STORE_OWNER") {
    redirect("/owner/store/overview");
  }

  // if (user?.role !== "ADMIN") {
  //   return <KasiLaunchLanding />;
  // }

  const sp = await searchParams;

  const address = String(sp.address || "").trim();
  const area = String(sp.area || "").trim();
  const city = String(sp.city || "").trim();
  const postalCode = String(sp.postalCode || "").trim();

  const latParam = Number(sp.lat);
  const lngParam = Number(sp.lng);

  const hasCoords = Number.isFinite(latParam) && Number.isFinite(lngParam);

  let customerLat: number | null = null;
  let customerLng: number | null = null;

  if (hasCoords) {
    customerLat = latParam;
    customerLng = lngParam;
  } else if (address || area || city || postalCode) {
    const geocoded = await geocodeStoreAddress({
      address,
      area,
      city: city || area || "South Africa",
      postalCode,
    });

    if (geocoded) {
      customerLat = geocoded.lat;
      customerLng = geocoded.lng;
    }
  }

  const hasLocation =
    typeof customerLat === "number" &&
    typeof customerLng === "number" &&
    Number.isFinite(customerLat) &&
    Number.isFinite(customerLng);

  const showFar = sp.showFar === "1";
  const showClosed = sp.showClosed === "1";

  const stores = hasLocation
    ? showClosed
      ? await getAllCollectionStores()
      : await getOpenCollectionStores()
    : [];

  const mappedStores = hasLocation
    ? stores
        .map((store) => {
          const distance = distanceKm(
            { lat: customerLat!, lng: customerLng! },
            {
              lat: store.lat!,
              lng: store.lng!,
            },
          );

          const collectionRadiusKm = store.collectionRadiusKm ?? 5;
          const canOrder = distance <= collectionRadiusKm;

          return {
            ...store,
            distanceKm: distance,
            canOrder,
            collectionRadiusKm,
          };
        })
        .filter((store) => showFar || store.canOrder)
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : [];

  return (
    <main className="min-h-screen overflow-hidden bg-kasi-cream">
      <section className="relative border-b border-black/10 bg-kasi-black text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-street-orange blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-kasi-green blur-3xl" />
          <div className="absolute right-1/3 top-20 h-40 w-40 rounded-full bg-golden-yellow blur-3xl" />
        </div>

        <div className="kf-container relative py-12 sm:py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <span className="kf-pill border-white/10 bg-white/10 text-white">
                Order online. Collect nearby.
              </span>

              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-7xl">
                Kasi food without the{" "}
                <span className="text-kasi-green">long wait.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/75 sm:text-lg">
                Find nearby kasi food spots, browse their menus, place your
                order online, and collect when your food is ready.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a href="#location" className="kf-btn-primary">
                  Find food near me
                </a>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-full border-2 border-white/20 bg-white/10 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white hover:text-kasi-black"
                >
                  How collection works
                </a>
              </div>

              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                <HeroMiniCard icon="📍" text="Find nearby spots" />
                <HeroMiniCard icon="🛍️" text="Order for pickup" />
                <HeroMiniCard icon="🍟" text="Collect fresh food" />
              </div>
            </div>

            <div className="relative">
              <div className="rotate-1 rounded-4xl border-4 border-white bg-kasi-cream p-5 text-kasi-black shadow-2xl">
                <div className="rounded-3xl bg-kasi-black p-5 text-white">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-kasi-green px-3 py-1 text-xs font-black uppercase">
                      Collection first
                    </span>
                    <span className="text-3xl">🌶️</span>
                  </div>

                  <div className="mt-8">
                    <p className="text-sm font-bold uppercase tracking-wide text-golden-yellow">
                      Today&apos;s craving
                    </p>

                    <h2 className="mt-2 text-4xl font-black leading-none">
                      Loaded Kota
                    </h2>

                    <p className="mt-3 text-sm text-white/70">
                      Chips, egg, sausage, sauce and street flavour from local
                      kitchens near you.
                    </p>
                  </div>

                  <div className="mt-8 rounded-2xl bg-white p-4 text-kasi-black">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase text-black/50">
                          Simple flow
                        </p>
                        <p className="text-lg font-black">
                          Order. Wait. Collect.
                        </p>
                      </div>

                      <div className="rounded-full bg-street-orange px-4 py-2 text-sm font-black text-white">
                        Fresh
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 hidden rounded-2xl bg-golden-yellow px-5 py-3 text-sm font-black text-kasi-black shadow-lg sm:block">
                Pickup made easier 🔥
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="location" className="kf-container relative z-10 -mt-6">
        <div className="kf-card p-5">
          <p className="text-xs font-black uppercase tracking-wide text-kasi-green">
            Start with your location
          </p>

          <h2 className="mt-1 text-2xl font-black tracking-tight text-kasi-black">
            Find collection spots near you
          </h2>

          <p className="mt-2 text-sm font-medium leading-6 text-black/60">
            Kasi Flavors starts with collection. Share your location or enter
            your address so we can show food spots close enough for pickup.
          </p>

          <LocationSearch
            initialAddress={address}
            initialArea={area}
            initialCity={city}
            initialPostalCode={postalCode}
            initialLat={hasLocation ? customerLat : null}
            initialLng={hasLocation ? customerLng : null}
            showFar={showFar}
            showClosed={showClosed}
          />
        </div>
      </section>

      <section id="how-it-works" className="kf-container mt-8">
        <div className="grid gap-3 rounded-4xl bg-kasi-black p-4 text-white sm:grid-cols-3">
          <InfoCard
            icon="📍"
            title="Choose your location"
            text="We show food spots close enough for collection."
          />

          <InfoCard
            icon="🍔"
            title="Order online"
            text="Browse the menu, choose your food, and place your order."
          />

          <InfoCard
            icon="🛍️"
            title="Collect when ready"
            text="Go to the store and collect your food when it is ready."
          />
        </div>
      </section>

      <section id="stores" className="kf-container py-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-street-orange">
              Nearby collection spots
            </p>

            <h2 className="text-2xl font-black tracking-tight text-kasi-black sm:text-3xl">
              Local food spots
            </h2>
          </div>

          {hasLocation && (
            <p className="text-sm font-bold text-black/55">
              {mappedStores.length}{" "}
              {mappedStores.length === 1 ? "store" : "stores"} found
            </p>
          )}
        </div>

        {!hasLocation ? (
          <div className="kf-card p-6 text-sm font-medium text-black/65">
            <p className="text-lg font-black text-kasi-black">
              Enter your location first
            </p>

            <p className="mt-2">
              We only show collection stores after we know where you are. This
              helps prevent orders from stores that are too far to collect from.
            </p>
          </div>
        ) : mappedStores.length === 0 ? (
          <div className="kf-card p-6 text-sm font-medium text-black/65">
            <p className="text-lg font-black text-kasi-black">
              No nearby collection stores found.
            </p>

            <p className="mt-2">
              Try showing further stores, checking closed stores, or coming back
              later as more food spots join Kasi Flavors.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {/* <Link
                href={`/?lat=${customerLat}&lng=${customerLng}&address=${encodeURIComponent(
                  address,
                )}&area=${encodeURIComponent(
                  area,
                )}&city=${encodeURIComponent(
                  city,
                )}&postalCode=${encodeURIComponent(postalCode)}&showFar=1${
                  showClosed ? "&showClosed=1" : ""
                }#stores`}
                className="kf-btn-primary inline-flex"
              >
                Show further stores
              </Link> */}

              <Link href="/" className="kf-btn-secondary inline-flex">
                Reset location
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mappedStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function HeroMiniCard({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <p className="text-2xl">{icon}</p>
      <p className="mt-1 text-xs font-bold text-white/70">{text}</p>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-2xl">{icon}</p>

      <h3 className="mt-2 font-black">{title}</h3>

      <p className="mt-1 text-sm text-white/65">{text}</p>
    </div>
  );
}
