// app/api/store-onboarding/complete/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserMinimal } from "@/lib/auth";
import { geocodeStoreAddress } from "@/lib/location/geocode";
import { revalidateTag } from "next/cache";
import { sendStoreOnboardingSuccessEmail } from "@/lib/email/send-store-onboarding-email";

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "store";
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

function normalizeCategoryName(value: unknown) {
  const category = String(value || "").trim();
  return category || "Menu";
}

function normalizePrepTime(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 25;
  return Math.max(5, Math.min(180, Math.round(n)));
}

function normalizeOptionalCoordinate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  return n;
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

function getUniqueCategoryNames(
  products: ReturnType<typeof normalizeProducts>,
) {
  const names = Array.from(
    new Map(
      products.map((product) => {
        const name = normalizeCategoryName(product.categoryName);
        return [name.toLowerCase(), name];
      }),
    ).values(),
  );

  if (!names.some((name) => name.toLowerCase() === "menu")) {
    names.push("Menu");
  }

  return names;
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
        { status: 401 },
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
      storeInput?.storeName || onboarding?.storeName || "",
    ).trim();

    const description = String(
      storeInput?.description || onboarding?.description || "",
    ).trim();

    const address = String(
      storeInput?.address || onboarding?.address || "",
    ).trim();

    const area = String(storeInput?.area || onboarding?.area || "").trim();
    const city = String(storeInput?.city || onboarding?.city || "").trim();

    const postalCode = String(
      storeInput?.postalCode || onboarding?.postalCode || "",
    ).trim();

    const phone = String(storeInput?.phone || onboarding?.phone || "").trim();

    const inputLat = normalizeOptionalCoordinate(storeInput?.lat);
    const inputLng = normalizeOptionalCoordinate(storeInput?.lng);

    const onboardingLat = normalizeOptionalCoordinate((onboarding as any)?.lat);
    const onboardingLng = normalizeOptionalCoordinate((onboarding as any)?.lng);

    let lat = inputLat ?? onboardingLat;
    let lng = inputLng ?? onboardingLng;

    const avgPrepTimeMinutes = normalizePrepTime(
      storeInput?.avgPrepTimeMinutes ?? onboarding?.avgPrepTimeMinutes ?? 25,
    );

    // Online-first model: online payments are always enabled.
    // Do not trust the client to disable this.
    const onlinePaymentsEnabled = true;

    // Optional owner-controlled cash payments.
    const cashOnCollectionEnabled = Boolean(
      storeInput?.cashOnCollectionEnabled ??
      (onboarding as any)?.cashOnCollectionEnabled ??
      false,
    );

    if (!storeName) {
      return NextResponse.json(
        { success: false, error: "Store name is required." },
        { status: 400 },
      );
    }

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Store address is required." },
        { status: 400 },
      );
    }

    if (!city) {
      return NextResponse.json(
        { success: false, error: "City is required." },
        { status: 400 },
      );
    }

    const validProducts = normalizeProducts(productsInput);

    if (validProducts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Add at least one valid product." },
        { status: 400 },
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
        { status: 409 },
      );
    }

    let locationVerified =
      typeof lat === "number" &&
      typeof lng === "number" &&
      Number.isFinite(lat) &&
      Number.isFinite(lng);

    if (!locationVerified) {
      const geocoded = await geocodeStoreAddress({
        address,
        area,
        city,
        postalCode,
      });

      if (geocoded) {
        lat = geocoded.lat;
        lng = geocoded.lng;
        locationVerified = geocoded.precision === "EXACT_ADDRESS";
      }
    }

    const baseSlug = slugify(storeName);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const result = await prisma.$transaction(
      async (tx) => {
        const createdStore = await tx.store.create({
          data: {
            ownerId: user.id,
            name: storeName,
            slug,
            description: description || null,
            address,
            area,
            city,
            postalCode: postalCode || null,
            phone: phone || null,

            lat,
            lng,
            locationVerified,

            avgPrepTimeMinutes,

            approvalStatus: "PENDING_REVIEW",
            isOpen: false,

            supportsCollection: true,
            supportsDelivery: false,
            deliveryFeeCents: null,
            deliveryRadiusKm: null,

            onlinePaymentsEnabled,
            cashOnCollectionEnabled,
          },
        });

        const categoryNames = getUniqueCategoryNames(validProducts);

        await tx.menuCategory.createMany({
          data: categoryNames.map((categoryName, index) => ({
            storeId: createdStore.id,
            name: categoryName,
            slug: slugify(categoryName),
            sortOrder: index,
            isActive: true,
          })),
        });

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
          ]),
        );

        const fallbackCategoryId = categoryMap.get("menu");

        if (!fallbackCategoryId) {
          throw new Error("Fallback menu category was not created.");
        }

        await tx.product.createMany({
          data: validProducts.map((product) => {
            const categoryName = normalizeCategoryName(product.categoryName);

            return {
              storeId: createdStore.id,
              categoryId:
                categoryMap.get(categoryName.toLowerCase()) ??
                fallbackCategoryId,
              name: product.name,
              description: product.description,
              priceCents: product.priceCents,
              imageUrl: product.imageUrl,
              isAvailable: product.isAvailable,
              priceAdjustmentEnabled: product.priceAdjustmentEnabled,
              priceAdjustmentPercent: product.priceAdjustmentPercent,
            };
          }),
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            role: "STORE_OWNER",
          },
        });

        const onboardingData = {
          status: "COMPLETED",
          storeName,
          description: description || null,
          address,
          area,
          city,
          postalCode: postalCode || null,
          phone: phone || null,

          lat,
          lng,

          avgPrepTimeMinutes,
          supportsCollection: true,
          supportsDelivery: false,
          deliveryFeeCents: null,
          deliveryRadiusKm: null,
          onlinePaymentsEnabled,
          cashOnCollectionEnabled,

          reviewedProductsJson: validProducts,
          createdStoreId: createdStore.id,
          errorMessage: null,
        };

        const completedOnboarding = onboarding
          ? await tx.storeOnboarding.update({
              where: { id: onboarding.id },
              data: onboardingData,
            })
          : await tx.storeOnboarding.create({
              data: {
                ownerId: user.id,
                ...onboardingData,
              },
            });

        return {
          storeId: createdStore.id,
          storeName: createdStore.name,
          storeSlug: createdStore.slug,
          onboardingId: completedOnboarding.id,
        };
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    );

    revalidateTag("stores", "max");
    revalidateTag("stores:open-collection", "max");
    revalidateTag("stores:all-collection", "max");
    revalidateTag(`store:${result.storeSlug}`, "max");
    revalidateTag(`store-menu:${result.storeSlug}`, "max");

    // Keep email outside the transaction.
    // If email fails, store onboarding still succeeds.
    if (user.email) {
      try {
        await sendStoreOnboardingSuccessEmail({
          to: user.email,
          ownerName: user.name,
          storeName: result.storeName,
          storeSlug: result.storeSlug,
        });
      } catch (emailError) {
        if (process.env.NODE_ENV === "development") {
          console.error("Store onboarding email failed:", emailError);
        }
      }
    }

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
      { status: 500 },
    );
  }
}
