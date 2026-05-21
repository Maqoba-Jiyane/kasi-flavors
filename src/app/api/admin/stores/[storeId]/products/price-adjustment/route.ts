import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";

function clampPercent(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(-100, Math.min(100, n));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ["ADMIN"]);

    const { storeId } = await params;
    const body = await req.json();

    const productIds = Array.isArray(body?.productIds)
      ? body.productIds.map(String).filter(Boolean)
      : [];

    const enabled = Boolean(body?.priceAdjustmentEnabled);
    const percent = enabled ? clampPercent(body?.priceAdjustmentPercent) : 0;

    if (productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Select at least one product." },
        { status: 400 },
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found." },
        { status: 404 },
      );
    }

    const result = await prisma.product.updateMany({
      where: {
        id: { in: productIds },
        storeId: store.id,
      },
      data: {
        priceAdjustmentEnabled: enabled,
        priceAdjustmentPercent: percent,
      },
    });

    revalidateTag("stores", "max");
    revalidateTag(`store:${store.slug}`, "max");
    revalidateTag(`store-menu:${store.slug}`, "max");

    revalidatePath(`/admin/stores/${store.id}`);
    revalidatePath(`/admin/stores/${store.id}/products`);
    revalidatePath(`/stores/${store.slug}`);

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Admin product price adjustment failed:", error);
    }

    return NextResponse.json(
      { success: false, error: "Failed to update product prices." },
      { status: 500 },
    );
  }
}