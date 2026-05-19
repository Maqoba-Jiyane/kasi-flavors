import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-black/10 bg-kasi-black text-white">
      {/* CTA strip */}
      <div className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-golden-yellow">
              Hungry?
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-tight">
              Skip the queue.{" "}
              <span className="text-kasi-green">Order online.</span>
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-white/65">
              Browse local kasi food spots, place your order, and collect or get
              delivery where available.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-street-orange px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-kasi-green"
          >
            Browse stores
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white bg-white text-lg font-black text-kasi-black">
                KF
              </div>

              <div className="leading-none">
                <span className="block text-xl font-black tracking-tight text-kasi-green">
                  Kasi
                </span>
                <span className="-mt-0.5 block text-lg font-black tracking-tight text-golden-yellow">
                  Flavors
                </span>
              </div>
            </Link>

            <p className="mt-4 text-sm font-medium leading-6 text-white/65">
              Real flavors. Real kasi. Built to help local township food
              businesses serve more customers online.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/75">
                🍟 Kota
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/75">
                🍔 Burgers
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/75">
                🌶️ Kasi food
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-wide text-golden-yellow">
              Quick Links
            </h4>

            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/become-a-partner"
                  className="text-sm font-semibold text-white/65 transition hover:text-kasi-green"
                >
                  List your store
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-sm font-semibold text-white/65 transition hover:text-kasi-green"
                >
                  Browse Stores
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="text-sm font-semibold text-white/65 transition hover:text-kasi-green"
                >
                  My Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/track"
                  className="text-sm font-semibold text-white/65 transition hover:text-kasi-green"
                >
                  Track Order
                </Link>
              </li>
              <li>
                <Link
                  href="/owner-application"
                  className="text-sm font-semibold text-white/65 transition hover:text-kasi-green"
                >
                  Open a Store
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-wide text-golden-yellow">
              Support
            </h4>

            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm font-semibold text-white/65 transition hover:text-kasi-green"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@kasiflavors.co.za"
                  className="text-sm font-semibold text-white/65 transition hover:text-kasi-green"
                >
                  support@kasiflavors.co.za
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/27701234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-white/65 transition hover:text-kasi-green"
                >
                  WhatsApp us
                </a>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-wide text-golden-yellow">
              Kasi Born
            </h4>

            <p className="mt-4 text-sm font-medium leading-6 text-white/65">
              Supporting local kasi kitchens, kota spots, fast food sellers, and
              township food culture across South Africa.
            </p>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-sm font-black text-white">
                Fast & easy ordering
              </p>
              <p className="mt-1 text-xs font-medium leading-5 text-white/60">
                Customers order online. Stores prepare. Everyone saves time.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm font-medium text-white/55">
              © {currentYear} Kasi Flavors. All rights reserved.
            </p>

            <div className="flex items-center gap-3">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-kasi-green hover:text-white"
                aria-label="Facebook"
              >
                <span className="text-sm font-black">f</span>
              </a>

              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-kasi-green hover:text-white"
                aria-label="Twitter"
              >
                <span className="text-sm font-black">X</span>
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-kasi-green hover:text-white"
                aria-label="Instagram"
              >
                <span className="text-sm font-black">IG</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
