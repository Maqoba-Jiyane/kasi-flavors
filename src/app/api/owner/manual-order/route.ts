// app/api/owner/manual-order/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createManualOrder } from "@/lib/manual-orders";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ["STORE_OWNER"]);

    const ownerId = user.id;
    const store = await prisma.store.findUnique({ where: { ownerId } });
    if (!store) return NextResponse.json({ success: false, error: "No store" }, { status: 403 });

    const body = await req.json();
    const items = body.items as { productId: string; quantity: number }[];

    // allow zero customer details for manual orders
    const order = await createManualOrder({
      ownerId,
      storeId: store.id,
      items,
      note: body.note,
      fulfilmentType: body.fulfilmentType === "DELIVERY" ? "DELIVERY" : "COLLECTION",
      // optional customer details (owner may enter)
      customerName: body.customerName,
      customerPhone: body.customerPhone,
    });

    // Don't send confirmation email by default.
    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ success: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
