// app/api/owner/manual-order/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createManualOrder } from "@/lib/manual-orders";
import { enqueueOrderConfirmationEmail } from "@/lib/queues/emailQueue";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ["STORE_OWNER"]);

    const ownerId = user.id;
    const store = await prisma.store.findUnique({ where: { ownerId } });
    if (!store)
      return NextResponse.json(
        { success: false, error: "No store" },
        { status: 403 }
      );

    const body = await req.json();

    console.log(body)

    const customerName =
      (body.fullName as string | undefined)?.trim() || "Walk-in Customer";
    const customerPhone = (body.phone as string | undefined)?.trim() || "";
    const email = (body.email as string | undefined)?.trim() || "";
    const note = (body.note as string | undefined)?.trim() || "";

    if (customerName.length > 32) throw new Error("Name too long");
    if (email && email.length > 32) throw new Error("Email too long");
    if (customerPhone.length > 10) throw new Error("Phone too long");
    if (note.length > 100) throw new Error("Note too long");

    const items = body.items as { productId: string; quantity: number }[];
    // allow zero customer details for manual orders
    const order = await createManualOrder({
      ownerId,
      storeId: store.id,
      items,
      note: body.note,
      fulfilmentType:
        body.fulfilmentType === "DELIVERY" ? "DELIVERY" : "COLLECTION",
      // optional customer details (owner may enter)
      customerName: body.customerName,
      customerPhone: body.customerPhone,
    });

    if(order.customerEmail){
      await enqueueOrderConfirmationEmail({
        tenantId: order.storeId,
        orderId: order.id,
        userId: user.id,
      });
    }

    // Don't send confirmation email by default.
    return NextResponse.json({ success: true, orderId: order.id });
  } catch (err) {
    console.error("Manual order failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to create order. Please try again later.",
      },
      { status: 500 }
    );
  }
}
