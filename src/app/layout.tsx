import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import CustomerNavbar from "@/components/nav/CustomerNavbar";
import AdminNavbar from "@/components/nav/AdminNavbar";
import { getCartForUser, getEmptyCart } from "@/lib/cart";
import { getCurrentUserMinimal } from "@/lib/auth";
import { ToasterProvider } from "@/components/ui/ToasterProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kasiflavors.co.za"), // ⬅️ update if your production domain differs
  title: {
    default: "Kasi Flavors | Kasi food delivery & collection",
    template: "%s | Kasi Flavors",
  },
  description:
    "Order authentic kasi cuisine from local spots near you. Browse menus, place your order online, and collect or get delivery from your favourite township kitchens.",
  applicationName: "Kasi Flavors",
  keywords: [
    "Kasi Flavors",
    "kasi food",
    "township food delivery",
    "kasi cuisine",
    "food collection",
    "South Africa food delivery",
    "local restaurants",
    "township restaurants",
    "kota",
    "skopo",
    "mogodo",
    "pap",
    "bunny chow",
  ],
  referrer: "origin-when-cross-origin",
  category: "food",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Kasi Flavors",
    title: "Kasi Flavors | Kasi food delivery & collection",
    description:
      "Order authentic kasi cuisine from local spots near you. Browse menus, place your order online, and collect or get delivery from your favourite township kitchens.",
    url: "/",
    locale: "en_ZA",
    images: [
      {
        url: "/og-image.png", // ⬅️ ensure this exists in /public
        width: 1200,
        height: 630,
        alt: "Kasi Flavors – kasi cuisines all under one roof",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kasi Flavors | Kasi food delivery & collection",
    description:
      "Order authentic kasi cuisine from local spots near you. Browse menus, place your order online, and collect or get delivery from your favourite township kitchens.",
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
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {user?.role === "ADMIN" ? (
            <AdminNavbar />
          ) : (
            <CustomerNavbar cartCount={cartCount} userName={user?.name} />
          )}
        <ToasterProvider />
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
