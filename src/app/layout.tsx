import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import CustomerNavbar from "@/components/nav/CustomerNavbar";
import { readCartFromCookies } from "@/lib/cart";
import { getCurrentUser } from "@/lib/auth";

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
  const cart = await readCartFromCookies()
  const user = await getCurrentUser()
  return (
    <ClerkProvider>
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CustomerNavbar cartCount={cart.items.length} userName={user?.name}/>
        <main>{children}</main>
      </body>
    </html>
    
    </ClerkProvider>
  );
}
