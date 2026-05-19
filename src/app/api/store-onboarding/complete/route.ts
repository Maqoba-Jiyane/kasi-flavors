// app/api/store-onboarding/complete/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserMinimal } from "@/lib/auth";

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "menu";
}

function normalizePriceCents(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

function normalizePercent(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return n;
}

function normalizeCategoryName(value: unknown) {
  const category = String(value || "").trim();
  return category || "Menu";
}

function normalizePrepTime(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 25;
  return Math.max(5, Math.min(180, Math.round(n)));
}

function normalizeDeliveryRadius(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function normalizeProducts(productsInput: unknown[]) {
  return productsInput
    .map((product: any) => ({
      name: String(product?.name || "").trim(),
      description: product?.description
        ? String(product.description).trim()
        : null,
      categoryName: normalizeCategoryName(
        product?.categoryName || product?.category
      ),
      priceCents: normalizePriceCents(product?.priceCents),
      imageUrl: product?.imageUrl ? String(product.imageUrl).trim() : null,
      isAvailable: product?.isAvailable !== false,
      priceAdjustmentEnabled: Boolean(product?.priceAdjustmentEnabled),
      priceAdjustmentPercent: normalizePercent(
        product?.priceAdjustmentPercent
      ),
    }))
    .filter((product) => product.name && product.priceCents > 0);
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserMinimal();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Please sign in before submitting your store.",
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const onboardingId = String(body?.onboardingId || "").trim();
    const storeInput = body?.store || {};
    const productsInput = Array.isArray(body?.products) ? body.products : [];

    const onboarding = onboardingId
      ? await prisma.storeOnboarding.findFirst({
          where: {
            id: onboardingId,
            ownerId: user.id,
          },
        })
      : null;

    const storeName = String(
      storeInput?.storeName || onboarding?.storeName || ""
    ).trim();

    const address = String(
      storeInput?.address || onboarding?.address || ""
    ).trim();

    const city = String(storeInput?.city || onboarding?.city || "").trim();
    const area = String(storeInput?.area || onboarding?.area || "").trim();

    const description = String(
      storeInput?.description || onboarding?.description || ""
    ).trim();

    const phone = String(storeInput?.phone || onboarding?.phone || "").trim();

    const supportsCollection = Boolean(
      storeInput?.supportsCollection ?? onboarding?.supportsCollection
    );

    const supportsDelivery = Boolean(
      storeInput?.supportsDelivery ?? onboarding?.supportsDelivery
    );

    const avgPrepTimeMinutes = normalizePrepTime(
      storeInput?.avgPrepTimeMinutes ?? onboarding?.avgPrepTimeMinutes ?? 25
    );

    const deliveryFeeCents = normalizePriceCents(
      storeInput?.deliveryFeeCents ?? onboarding?.deliveryFeeCents ?? 0
    );

    const deliveryRadiusKm = normalizeDeliveryRadius(
      storeInput?.deliveryRadiusKm ?? onboarding?.deliveryRadiusKm ?? null
    );

    const onlinePaymentsEnabled = Boolean(
      storeInput?.onlinePaymentsEnabled ?? onboarding?.onlinePaymentsEnabled
    );

    if (!storeName) {
      return NextResponse.json(
        { success: false, error: "Store name is required." },
        { status: 400 }
      );
    }

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Store address is required." },
        { status: 400 }
      );
    }

    if (!city) {
      return NextResponse.json(
        { success: false, error: "City is required." },
        { status: 400 }
      );
    }

    if (!supportsCollection && !supportsDelivery) {
      return NextResponse.json(
        {
          success: false,
          error: "Choose at least one order option: collection or delivery.",
        },
        { status: 400 }
      );
    }

    const validProducts = normalizeProducts(productsInput);

    if (validProducts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Add at least one valid product." },
        { status: 400 }
      );
    }

    const existingStore = await prisma.store.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    });

    if (existingStore) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This account already has a store linked. Please use the owner dashboard to manage it.",
          redirectUrl: "/owner/store/overview",
        },
        { status: 409 }
      );
    }

    const baseSlug = slugify(storeName);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const result = await prisma.$transaction(async (tx) => {
      const createdStore = await tx.store.create({
        data: {
          ownerId: user.id,
          name: storeName,
          slug,
          description: description || null,
          address,
          city,
          area,
          avgPrepTimeMinutes,
          isOpen: false,
          supportsCollection,
          supportsDelivery,
          deliveryFeeCents,
          deliveryRadiusKm,
          onlinePaymentsEnabled,
        },
      });

      const uniqueCategoryNames = Array.from(
        new Set(validProducts.map((product) => product.categoryName))
      );

      for (let i = 0; i < uniqueCategoryNames.length; i++) {
        const categoryName = uniqueCategoryNames[i];

        await tx.menuCategory.upsert({
          where: {
            storeId_name: {
              storeId: createdStore.id,
              name: categoryName,
            },
          },
          update: {
            sortOrder: i,
            isActive: true,
          },
          create: {
            storeId: createdStore.id,
            name: categoryName,
            slug: slugify(categoryName),
            sortOrder: i,
            isActive: true,
          },
        });
      }

      const categories = await tx.menuCategory.findMany({
        where: {
          storeId: createdStore.id,
        },
        select: {
          id: true,
          name: true,
        },
      });

      const categoryMap = new Map(
        categories.map((category) => [
          category.name.toLowerCase(),
          category.id,
        ])
      );

      await tx.product.createMany({
        data: validProducts.map((product) => ({
          storeId: createdStore.id,
          categoryId:
            categoryMap.get(product.categoryName.toLowerCase()) ?? null,
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          imageUrl: product.imageUrl,
          isAvailable: product.isAvailable,
          priceAdjustmentEnabled: product.priceAdjustmentEnabled,
          priceAdjustmentPercent: product.priceAdjustmentPercent,
        })),
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          role: "STORE_OWNER",
        },
      });

      const completedOnboarding = onboarding
        ? await tx.storeOnboarding.update({
            where: { id: onboarding.id },
            data: {
              status: "COMPLETED",
              reviewedProductsJson: validProducts,
              createdStoreId: createdStore.id,
              errorMessage: null,
            },
          })
        : await tx.storeOnboarding.create({
            data: {
              ownerId: user.id,
              status: "COMPLETED",
              storeName,
              description: description || null,
              address,
              area,
              city,
              phone: phone || null,
              avgPrepTimeMinutes,
              supportsCollection,
              supportsDelivery,
              deliveryFeeCents,
              deliveryRadiusKm,
              onlinePaymentsEnabled,
              reviewedProductsJson: validProducts,
              createdStoreId: createdStore.id,
            },
          });

      return {
        storeId: createdStore.id,
        onboardingId: completedOnboarding.id,
      };
    });

    return NextResponse.json({
      success: true,
      onboardingId: result.onboardingId,
      storeId: result.storeId,
      redirectUrl: "/owner/store/overview",
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Store onboarding failed:", error);
    }

    return NextResponse.json(
      { success: false, error: "Failed to complete store onboarding." },
      { status: 500 }
    );
  }
}