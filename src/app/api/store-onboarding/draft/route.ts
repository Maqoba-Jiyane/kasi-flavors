// app/api/store-onboarding/draft/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentUser } from "@/lib/auth/getOrCreateCurrentUser";

function toInt(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function toFloatOrNull(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeCategoryName(value: unknown) {
  const category = String(value || "").trim();
  return category || "Menu";
}

function normalizePriceCents(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function normalizePercent(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-100, Math.min(100, n));
}

function normalizeProducts(productsInput: unknown[]) {
  return productsInput
    .map((product: any) => {
      const categoryName = normalizeCategoryName(
        product?.categoryName ||
          product?.category ||
          product?.menuCategory ||
          product?.categoryLabel,
      );

      return {
        name: String(product?.name || "").trim(),
        description: product?.description
          ? String(product.description).trim()
          : null,
        categoryName,
        priceCents: normalizePriceCents(product?.priceCents),
        imageUrl: product?.imageUrl ? String(product.imageUrl).trim() : null,
        isAvailable: product?.isAvailable !== false,
        priceAdjustmentEnabled: Boolean(product?.priceAdjustmentEnabled),
        priceAdjustmentPercent: normalizePercent(
          product?.priceAdjustmentPercent,
        ),
      };
    })
    .filter((product) => product.name && product.priceCents > 0);
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Please sign in first." },
        { status: 401 },
      );
    }

    const body = await req.json();

    const onboardingId = String(body?.onboardingId || "").trim();
    const store = body?.store || {};
    const products = normalizeProducts(body?.products);

    const data = {
      ownerId: user.id,
      status: products ? "MENU_EXTRACTED" : "DRAFT",
      storeName: String(store.storeName || "").trim() || null,
      description: String(store.description || "").trim() || null,
      address: String(store.address || "").trim() || null,
      area: String(store.area || "").trim() || null,
      city: String(store.city || "").trim() || null,
      lat: store.lat,
      lng: store.lng,
      postalCode: store.postalCode,
      phone: String(store.phone || "").trim() || null,
      avgPrepTimeMinutes: Math.max(
        5,
        Math.min(180, toInt(store.avgPrepTimeMinutes, 25)),
      ),
      supportsCollection: Boolean(store.supportsCollection),
      supportsDelivery: Boolean(store.supportsDelivery),
      deliveryFeeCents: toInt(store.deliveryFeeCents, 0),
      deliveryRadiusKm: toFloatOrNull(store.deliveryRadiusKm),
      onlinePaymentsEnabled: Boolean(store.onlinePaymentsEnabled),
      ...(products ? { reviewedProductsJson: products } : {}),
    };

    let onboarding;

    if (onboardingId) {
      const existing = await prisma.storeOnboarding.findFirst({
        where: {
          id: onboardingId,
          ownerId: user.id,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Draft not found." },
          { status: 404 },
        );
      }

      onboarding = await prisma.storeOnboarding.update({
        where: {
          id: existing.id,
        },
        data,
      });
    } else {
      onboarding = await prisma.storeOnboarding.create({
        data,
      });
    }

    return NextResponse.json({
      success: true,
      onboardingId: onboarding.id,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Save onboarding draft failed:", error);
    }

    return NextResponse.json(
      { success: false, error: "Failed to save onboarding draft." },
      { status: 500 },
    );
  }
}
