import Link from "next/link";
import { LaunchCountdown } from "./LaunchCountdown";

export function KasiLaunchLanding() {
  return (
    <main className="min-h-screen bg-kasi-cream">
      <section className="relative flex min-h-screen items-center overflow-hidden bg-kasi-black px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-street-orange blur-3xl" />
          <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-kasi-green blur-3xl" />
          <div className="absolute left-1/2 top-1/3 h-56 w-56 rounded-full bg-golden-yellow blur-3xl" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-golden-yellow">
              Opening 1 June 2026
            </p>

            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Kasi food, closer to the people.
            </h1>

            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/70 sm:text-lg">
              Kasi Flavors is being built for the food spots that keep the kasi
              moving — the kota makers, chip shops, grillers, plate sellers, and
              everyday entrepreneurs feeding their communities.
            </p>

            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/70">
              Before customers start ordering, we are helping store owners get
              ready by adding their stores, building digital menus, and preparing
              their food businesses for online orders.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/become-a-partner"
                className="inline-flex rounded-full bg-kasi-green px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-street-orange"
              >
                Add your food spot
              </Link>

              <Link
                href="/sign-in?redirect_url=/become-a-partner"
                className="inline-flex rounded-full border-2 border-white/20 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:bg-white hover:text-kasi-black"
              >
                Continue setup
              </Link>
            </div>

            <p className="mt-5 text-xs font-medium leading-5 text-white/50">
              Store onboarding is open now. Customer ordering opens soon.
            </p>
          </div>

          <div className="rounded-4xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur sm:p-6">
            <p className="text-xs font-black uppercase tracking-wide text-golden-yellow">
              We are almost ready
            </p>

            <h2 className="mt-2 text-2xl font-black">
              The kasi food table is being set.
            </h2>

            <p className="mt-2 text-sm font-medium leading-6 text-white/60">
              While we prepare the customer side of Kasi Flavors, food
              businesses can already start setting up their stores and menus.
            </p>

            <div className="mt-6">
              <LaunchCountdown />
            </div>

            <div className="mt-6 rounded-3xl bg-white/10 p-4">
              <p className="text-sm font-black text-white">
                Own a kota spot, grill, or food stall?
              </p>

              <p className="mt-1 text-xs font-medium leading-5 text-white/60">
                Add your store early so your menu is ready when customers start
                discovering food near them.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}