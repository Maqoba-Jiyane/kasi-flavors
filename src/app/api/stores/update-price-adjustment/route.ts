// app/api/stores/update-price-adjustment/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { storeId, priceAdjustmentEnabled, priceAdjustmentPercent } = body;

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: "Store ID is required" },
        { status: 400 }
      );
    }

    if (typeof priceAdjustmentEnabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "priceAdjustmentEnabled must be a boolean" },
        { status: 400 }
      );
    }

    if (
      typeof priceAdjustmentPercent !== "number" ||
      priceAdjustmentPercent < -100 ||
      priceAdjustmentPercent > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "priceAdjustmentPercent must be a number between -100 and 100",
        },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { ownerId: true },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found" },
        { status: 404 }
      );
    }

    // only admins or the store owner may update this
    if (user.role !== "ADMIN" && user.id !== store.ownerId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: {
        priceAdjustmentEnabled,
        priceAdjustmentPercent,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Price adjustment settings updated successfully",
      data: {
        storeId: updatedStore.id,
        priceAdjustmentEnabled: updatedStore.priceAdjustmentEnabled,
        priceAdjustmentPercent: updatedStore.priceAdjustmentPercent,
      },
    });
  } catch (error) {
    console.error("Error updating price adjustment settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update settings",
      },
      { status: 500 }
    );
  }
}
