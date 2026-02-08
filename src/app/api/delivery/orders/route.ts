import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserMinimal } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserMinimal();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a DELIVERY courier
    const courier = await prisma.courier.findUnique({
      where: { userId: user.id },
      include: { store: true },
    });

    if (!courier || !courier.isActive) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all delivery orders for this courier's store
    const orders = await prisma.order.findMany({
      where: {
        storeId: courier.storeId,
        fulfilmentType: "DELIVERY",
        status: {
          in: ["ACCEPTED", "IN_PREPARATION", "READY_FOR_COLLECTION", "OUT_FOR_DELIVERY", "COMPLETED"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        store: true,
        items: true,
      },
    });


    return NextResponse.json({
      orders: orders.map(order => ({
        ...order,
        createdAt: order.createdAt?.toISOString() || null,
        updatedAt: order.updatedAt?.toISOString() || null,
        estimatedReadyAt: order.estimatedReadyAt?.toISOString() || null,
        completedAt: order.completedAt?.toISOString() || null,
        items: order.items || [],
        store: order.store ? {
          ...order.store,
          createdAt: order.store.createdAt?.toISOString() || null,
          updatedAt: order.store.updatedAt?.toISOString() || null,
        } : null,
      }))
    });
  } catch (error) {
    console.error("Error fetching delivery orders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}