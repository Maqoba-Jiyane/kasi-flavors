// app/api/place-order/route.ts
import { NextResponse } from "next/server";
import { createOrderFromPayload } from "@/lib/orders";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { randomUUID } from "crypto";
import { readCartFromCookies } from "@/lib/cart";

const CART_COOKIE = process.env.CART_COOKIE || "kasi_cart";

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const storeId = (form.get("storeId") as string) || "";
    const itemsRaw = (form.get("items") as string) || "[]";
    const fullName = (form.get("fullName") as string) || "";
    const phone = (form.get("phone") as string) || "";
    const email = (form.get("email") as string) || "";
    const fulfilmentType =
      (form.get("fulfilmentType") as string) === "DELIVERY"
        ? "DELIVERY"
        : "COLLECTION";
    const note = (form.get("note") as string) || "";

    // parse items
    let items;
    try {
      items = JSON.parse(itemsRaw) as { productId: string; quantity: number }[];
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Invalid items" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0)
      return NextResponse.json({ success: false, error: "Empty cart" }, { status: 400 });

    // Create order
    const order = await createOrderFromPayload({
      storeId,
      items,
      fullName,
      phone,
      email,
      fulfilmentType,
      note,
    });


    const trackingToken = randomUUID();

    // send confirmation email (best-effort)
    await sendOrderConfirmationEmail({
      to: email,
      customerName: fullName,
      storeName: order.store.name,
      orderId: order.id.slice(-6),
      pickupCode: order.pickupCode,
      fulfilmentType: order.fulfilmentType,
      totalCents: order.totalCents,items: order.items, trackingToken
    });

    // Clear cart cookie by setting it to empty and maxAge 0
    const res = NextResponse.json({
      success: true,
      orderId: order.id,
      redirectUrl: `/orders/${order.id}`,
    });

    // Clear cookie on response (works in App Router)
    res.cookies.set({
      name: CART_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (err) {
    if(err instanceof Error){
      console.error("Place order failed:", err);
      return NextResponse.json(
        { success: false, error: err?.message || "Server error" },
        { status: 500 }
      );
    }
    console.error("Place order failed:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const cart = (await readCartFromCookies()).items
  return NextResponse.json({success: true, cart})
}

// small helper
function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
