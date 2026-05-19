// app/(public)/become-a-partner/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { StoreSignupClient } from "./StoreSignupClient";
import { getOrCreateCurrentUser } from "@/lib/auth/getOrCreateCurrentUser";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "List your store",
  description:
    "Join Kasi Flavors and bring your food business online. Add your store, upload your menu, and let us help digitise your products.",
};

export default async function BecomePartnerPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in?redirect_url=/become-a-partner");
  }

  const user = await getOrCreateCurrentUser();

  if (!user) {
    redirect("/sign-in?redirect_url=/become-a-partner");
  }

  const savedOnboarding = await prisma.storeOnboarding.findFirst({
    where: {
      ownerId: user.id,
      status: {
        in: ["DRAFT", "MENU_EXTRACTED", "SUBMITTED"],
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return (
    <main className="min-h-screen bg-kasi-cream">
      <section className="relative overflow-hidden bg-kasi-black text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-street-orange blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-kasi-green blur-3xl" />
          <div className="absolute right-1/3 top-20 h-40 w-40 rounded-full bg-golden-yellow blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-golden-yellow">
              Store onboarding
            </p>

            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Let&apos;s list your store.
            </h1>

            <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/70 sm:text-lg">
              Add your store details, upload your menu, and review your digital
              products before your store goes live.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <StoreSignupClient
          user={{
            name: user.name,
            email: user.email,
          }}
savedOnboarding={
  savedOnboarding
    ? {
        id: savedOnboarding.id,
        status: savedOnboarding.status,
        storeName: savedOnboarding.storeName,
        description: savedOnboarding.description,
        address: savedOnboarding.address,
        area: savedOnboarding.area,
        city: savedOnboarding.city,
        phone: savedOnboarding.phone,
        avgPrepTimeMinutes: savedOnboarding.avgPrepTimeMinutes,
        supportsCollection: savedOnboarding.supportsCollection,
        supportsDelivery: savedOnboarding.supportsDelivery,
        deliveryFeeCents: savedOnboarding.deliveryFeeCents,
        deliveryRadiusKm: savedOnboarding.deliveryRadiusKm,
        onlinePaymentsEnabled: savedOnboarding.onlinePaymentsEnabled,
        namingTheme: savedOnboarding.namingTheme,
        extractedMenuJson: savedOnboarding.extractedMenuJson,
        reviewedProductsJson: savedOnboarding.reviewedProductsJson,
        menuImages: savedOnboarding.menuImages,
      }
    : null
}
        />
      </section>
    </main>
  );
}