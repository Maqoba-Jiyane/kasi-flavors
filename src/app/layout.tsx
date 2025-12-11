import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import CustomerNavbar from "@/components/nav/CustomerNavbar";
import AdminNavbar from "@/components/nav/AdminNavbar";
import { getCartForUser, getEmptyCart } from "@/lib/cart";
import { getCurrentUserMinimal } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kasi Flavors",
  description: "Your kasi cuisines, all under one roof.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUserMinimal();

  // If no user, cart is empty. If user exists, read cart from DB.
  const cart = user ? await getCartForUser(user.id) : getEmptyCart();

  // You can use either distinct line count or total quantity.
  // Previously you used `cart.items.length`, so I’ve kept that.
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
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
