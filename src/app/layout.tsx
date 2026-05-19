import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import CustomerNavbar from "@/components/nav/CustomerNavbar";
import AdminNavbar from "@/components/nav/AdminNavbar";
import { getCartForUser, getEmptyCart } from "@/lib/cart";
import { getCurrentUserMinimal } from "@/lib/auth";
import { ToasterProvider } from "@/components/ui/ToasterProvider";
import Footer from "@/components/Footer";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kasiflavors.co.za"),
  title: {
    default: "Kasi Flavors | Skip the Queue. Order Online.",
    template: "%s | Kasi Flavors",
  },
  description:
    "Order authentic kasi food from local township spots near you. Browse menus, skip the queue, order online, and collect or get delivery.",
  applicationName: "Kasi Flavors",
  keywords: [
    "Kasi Flavors",
    "kasi food",
    "kota near me",
    "township food delivery",
    "kasi cuisine",
    "skip the queue",
    "order online",
    "food collection",
    "South Africa food delivery",
    "local restaurants",
    "township restaurants",
    "kota",
    "chips",
    "bunny chow",
    "shisanyama",
  ],
  referrer: "origin-when-cross-origin",
  category: "food",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Kasi Flavors",
    title: "Kasi Flavors | Skip the Queue. Order Online.",
    description:
      "Find local kasi food spots near you. Order kota, chips, bunny chow and more online for collection or delivery.",
    url: "/",
    locale: "en_ZA",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kasi Flavors – skip the queue and order kasi food online",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kasi Flavors | Skip the Queue. Order Online.",
    description:
      "Order authentic kasi food from local township spots near you.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserMinimal();
  const cart = user ? await getCartForUser(user.id) : getEmptyCart();
  const cartCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${poppins.variable} min-h-screen bg-kasi-cream text-kasi-black antialiased flex flex-col`}
        >
          {user?.role === "ADMIN" ? (
            <AdminNavbar />
          ) : (
            <CustomerNavbar cartCount={cartCount} userName={user?.name} />
          )}

          <ToasterProvider />

          <main className="flex-1">{children}</main>

          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}