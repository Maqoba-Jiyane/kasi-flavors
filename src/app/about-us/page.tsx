import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Handshake,
  HeartHandshake,
  ShoppingBag,
  Truck,
  Users,
  Utensils,
  WalletCards,
} from "lucide-react";
import { getAvailableStoreCountCached } from "@/lib/stores/getAvailableStoreCount";

export const metadata: Metadata = {
  title: "About Kasi Flavors",
  description:
    "Kasi Flavors is more than a food ordering platform. We are building an ecosystem for township food businesses in South Africa.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    type: "website",
    title: "About Kasi Flavors",
    description:
      "A movement built to help township food businesses reach more customers, grow stronger, and create livelihoods in South Africa.",
    url: "/about",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Kasi Flavors",
    description:
      "Kasi Flavors exists to fill more stomachs, build more livelihoods, and leave every business bigger than we found it.",
  },
};

const ecosystemItems = [
  {
    title: "Online ordering",
    text: "Customers can browse a seller’s menu, place an order online, skip the queue, and collect when the food is ready.",
    icon: ShoppingBag,
  },
  {
    title: "Supplier connections",
    text: "We are building toward linking sellers with suppliers so they can source ingredients more affordably and reliably.",
    icon: Handshake,
  },
  {
    title: "Business funding",
    text: "We want to help kasi food businesses access financial support that traditional systems often keep out of reach.",
    icon: WalletCards,
  },
  {
    title: "Delivery opportunities",
    text: "Our delivery network will create income opportunities for community members who can deliver for local food spots.",
    icon: Truck,
  },
  {
    title: "Business growth tools",
    text: "We want to support sellers with visibility, marketing, trust-building, and practical tools that help them grow.",
    icon: BriefcaseBusiness,
  },
];

export default async function AboutPage() {
  const availableStoreCount = await getAvailableStoreCountCached();
  const remainingSpots = Math.max(0, 1000 - availableStoreCount);

  return (
    <main className="min-h-screen bg-kasi-cream">
      {/* Hero */}
      <section className="relative overflow-hidden bg-kasi-black text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-street-orange blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-kasi-green blur-3xl" />
          <div className="absolute left-1/2 top-20 h-56 w-56 rounded-full bg-golden-yellow blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-4xl">
            <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-golden-yellow ring-1 ring-white/10">
              About Kasi Flavors
            </p>

            <h1 className="mt-6 text-4xl font-black leading-none tracking-tight sm:text-6xl lg:text-7xl">
              This is bigger than ordering food.
            </h1>

            <p className="mt-6 max-w-3xl text-base font-medium leading-8 text-white/75 sm:text-lg">
              Kasi Flavors was built for the people behind the food — the kota
              sellers, pap plates, skopo spots, braai stands, bunny chow makers,
              and township food entrepreneurs feeding South Africa every day.
            </p>

            <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-lg font-black leading-7 text-white sm:text-2xl">
                Fill more stomachs. Build more livelihoods. Leave every business
                bigger than we found it.
              </p>
            </div>

            <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                The 1000 business commitment
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/45">
                    Joined
                  </p>
                  <p className="mt-1 text-2xl font-black text-golden-yellow">
                    {availableStoreCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/45">
                    Total
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">1000</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/45">
                    Left
                  </p>
                  <p className="mt-1 text-2xl font-black text-kasi-green">
                    {remainingSpots}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs font-medium leading-5 text-white/45">
                Count updated weekly. Once all 1000 spots are filled, the
                platform is full.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/become-a-partner"
                className="inline-flex items-center justify-center rounded-full bg-kasi-green px-6 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-street-orange"
              >
                Claim your seller spot
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>

              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-4 text-sm font-black text-white transition hover:bg-white hover:text-kasi-black"
              >
                Browse food spots
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Who we are */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <SectionLabel
            eyebrow="Who we are"
            title="A platform for kasi food sellers and the communities they serve."
          />

          <div className="space-y-5 text-sm font-medium leading-7 text-black/65 sm:text-base sm:leading-8">
            <p>
              Kasi Flavors is an online platform that helps customers order food
              online and collect directly from local township food businesses.
            </p>

            <p>
              A customer can find a local food spot, browse the menu, place an
              order, skip the queue, and collect when the food is ready.
            </p>

            <p>
              For sellers, joining Kasi Flavors is free. That matters to us,
              because many township food businesses are already working hard
              every day. They are already feeding people, creating income, and
              serving their communities.
            </p>

            <p className="font-black text-kasi-black">
              Our job is not to come in and act like we are saving them. Our job
              is to give them better tools.
            </p>
          </div>
        </div>
      </section>

      {/* Why we exist */}
      <section className="border-y border-black/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-street-orange">
                Why we exist
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight text-kasi-black sm:text-5xl">
                Township food businesses deserve more than survival.
              </h2>

              <div className="mt-6 space-y-5 text-sm font-medium leading-7 text-black/65 sm:text-base sm:leading-8">
                <p>
                  These businesses feed school children, taxi drivers, workers,
                  students, families, and late-night customers. They keep money
                  moving inside communities.
                </p>

                <p>
                  But many still grow without the support bigger businesses take
                  for granted: proper online ordering, affordable supplier
                  networks, access to funding, delivery infrastructure,
                  marketing support, and real visibility.
                </p>

                <p>
                  Kasi Flavors exists because township food entrepreneurs
                  deserve systems that work for them. They deserve to be seen,
                  supported, and taken seriously.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] bg-kasi-black p-6 text-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-golden-yellow text-kasi-black">
                <Utensils className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-2xl font-black">
                Food is only the start.
              </h3>

              <p className="mt-3 text-sm font-medium leading-7 text-white/70">
                Behind every plate is a business, a household, a dream, and a
                community that benefits when that business grows.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What we are building */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-wide text-street-orange">
            What we are building
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight text-kasi-black sm:text-5xl">
            A full ecosystem for township food businesses.
          </h2>

          <p className="mt-4 text-sm font-medium leading-7 text-black/60 sm:text-base sm:leading-8">
            Today, we help customers order online and collect. Tomorrow, Kasi
            Flavors becomes the infrastructure around the business.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ecosystemItems.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kasi-green text-white">
                  <Icon className="h-5 w-5" />
                </div>

                <h3 className="mt-4 text-xl font-black text-kasi-black">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm font-medium leading-6 text-black/60">
                  {item.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* 1000 commitment */}
      <section className="bg-kasi-black text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 text-center">
              <p className="text-7xl font-black leading-none text-golden-yellow sm:text-8xl">
                1000
              </p>
              <p className="mt-3 text-sm font-black uppercase tracking-wide text-white/70">
                Businesses only
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
                The 1000 commitment
              </p>

              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
                We would rather do right by 1000 businesses than fail 100,000.
              </h2>

              <div className="mt-6 space-y-5 text-sm font-medium leading-7 text-white/70 sm:text-base sm:leading-8">
                <p>
                  Kasi Flavors will only accept 1000 businesses. That limit is
                  intentional. It is not a gimmick. It is a promise.
                </p>

                <p>
                  We do not want sellers to join and disappear into the noise.
                  We do not want to chase numbers while the businesses we claim
                  to serve are left alone.
                </p>

                <p>
                  The cap allows us to give every business more attention, build
                  stronger relationships, and focus on quality, support, growth,
                  and results.
                </p>

                <p className="font-black text-white">
                  When all 1000 spots are filled, the platform is full. That is
                  by design.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our promise */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-street-orange text-white">
            <HeartHandshake className="h-7 w-7" />
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-wide text-street-orange">
            Our promise
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight text-kasi-black sm:text-5xl">
            Leave every business bigger than we found it.
          </h2>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-5 text-sm font-medium leading-7 text-black/65 sm:text-base sm:leading-8">
              <p>
                That does not only mean more orders, although more orders
                matter. It means more confidence, more visibility, more
                structure, more customers, and more power in the hands of the
                people already feeding South Africa from the ground up.
              </p>

              <p>
                If a seller joins doing 5 orders a day, we want to help them
                reach 10. If they are doing 50, we want to help them reach 100.
              </p>
            </div>

            <div className="rounded-[1.5rem] bg-kasi-cream p-5">
              <p className="text-sm font-black leading-7 text-kasi-black">
                Township food is not small. It is culture. It is business. It is
                employment. It is survival. It is pride. It is the taste of home
                for millions of South Africans.
              </p>

              <p className="mt-4 text-sm font-black leading-7 text-kasi-green">
                And it deserves infrastructure built with respect.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-black/10 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-kasi-black text-golden-yellow">
            <Users className="h-8 w-8" />
          </div>

          <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-black tracking-tight text-kasi-black sm:text-5xl">
            This is the beginning.
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-sm font-medium leading-7 text-black/60 sm:text-base sm:leading-8">
            To every kasi food seller: claim your spot. To every customer:
            support the food businesses in your community. To every supplier,
            partner, investor, journalist, and South African who believes in the
            township economy: watch this space, and get involved.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/become-a-partner"
              className="inline-flex items-center justify-center rounded-full bg-kasi-green px-6 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-street-orange"
            >
              Claim your spot
              <BadgeCheck className="ml-2 h-4 w-4" />
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border-2 border-black/10 bg-white px-6 py-4 text-sm font-black text-kasi-black transition hover:border-kasi-green hover:text-kasi-green"
            >
              Explore Kasi Flavors
            </Link>
          </div>

          <p className="mt-8 text-sm font-black text-kasi-black">
            Kasi Flavors · Skip the queue. Order online.
          </p>

          <p className="mt-2 text-sm font-medium text-black/50">
            kasiflavors.co.za
          </p>
        </div>
      </section>
    </main>
  );
}

function SectionLabel({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-street-orange">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black tracking-tight text-kasi-black sm:text-5xl">
        {title}
      </h2>
    </div>
  );
}
