// app/api/customers/orders/route.ts
import {
  ensurePhoneVerifiedOrStartVerification,
  verifyPhoneOtp,
} from "@/lib/phoneVerification";
import { NextResponse } from "next/server";
import { createOrderFromPayload } from "@/lib/orders";
import { getCartForUser, clearCartForUser } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { getCurrentUserMinimal } from "@/lib/auth";
import { enqueueOrderConfirmationEmail } from "@/lib/queues/emailQueue";
import { createOrderPaymentSession } from "@/lib/billing/payments";
import { enqueueOrderConfirmationWhatsApp } from "@/lib/queues/whatsappQueue";

const GENERIC_ERROR_MESSAGE = "Unable to place order. Please try again later.";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserMinimal();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const form = await req.formData();

    const idempotencyKeyRaw = (form.get("idempotencyKey") as string) || "";
    const idempotencyKey = idempotencyKeyRaw || undefined;

    const fullName = ((form.get("fullName") as string) || "").trim();
    let phone = ((form.get("phone") as string) || "").trim();
    const email = ((form.get("email") as string) || "").trim();
    const phoneOtp = ((form.get("phoneOtp") as string) || "").trim();

    const fulfilmentType =
      (form.get("fulfilmentType") as string) === "DELIVERY"
        ? "DELIVERY"
        : "COLLECTION";
    const useMyLocation = ((form.get("useMyLocation") as string) || "false") === "true";
    const latRaw = ((form.get("latitude") as string) || "").trim();
    const lngRaw = ((form.get("longitude") as string) || "").trim();
    const deliveryLat = latRaw ? Number.parseFloat(latRaw) : null;
    const deliveryLng = lngRaw ? Number.parseFloat(lngRaw) : null;
    const note = ((form.get("note") as string) || "").trim();
    const paymentMethod =
      (form.get("paymentMethod") as string) === "ONLINE_PAYMENT"
        ? "ONLINE_PAYMENT"
        : "CASH_ON_DELIVERY";

    // Extract delivery address fields (or lat/lng if user opted to use location)
    let deliveryAddress: string | null = null;
    if (fulfilmentType === "DELIVERY") {
      if (useMyLocation) {
        // Require lat/lng when using location
        if (deliveryLat == null || deliveryLng == null || Number.isNaN(deliveryLat) || Number.isNaN(deliveryLng)) {
          return NextResponse.json(
            { success: false, error: "Unable to determine your location. Please enter an address or try again." },
            { status: 400 }
          );
        }
      } else {
        const address = ((form.get("address") as string) || "").trim();
        const suburb = ((form.get("suburb") as string) || "").trim();
        const city = ((form.get("city") as string) || "").trim();

        if (!address) {
          return NextResponse.json(
            { success: false, error: "Please provide a delivery address." },
            { status: 400 }
          );
        }

        // Combine address components
        const addressParts = [address];
        if (suburb) addressParts.push(suburb);
        if (city) addressParts.push(city);
        deliveryAddress = addressParts.join(", ");
      }
    }

    if (phone.charAt(0) === "0") {
      phone = "+27" + phone.substring(1);
    }

    // 2) Basic input validation
    if (!fullName || fullName.length > 200) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid full name." },
        { status: 400 }
      );
    }

    if (!email || email.length > 320) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (phone && phone.length > 12) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid phone number." },
        { status: 400 }
      );
    }

    if (note && note.length > 1000) {
      return NextResponse.json(
        { success: false, error: "Note is too long." },
        { status: 400 }
      );
    }

    // 3) Load cart
    const cart = await getCartForUser(user.id);

    if (!cart.items.length || !cart.storeId) {
      return NextResponse.json(
        { success: false, error: "Your cart is empty." },
        { status: 400 }
      );
    }

    const storeId = cart.storeId;

    // Load store to check delivery settings
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        deliveryRadiusKm: true,
        deliveryFeeCents: true,
        lat: true,
        lng: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Store not found." },
        { status: 400 }
      );
    }

    const items = cart.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
    }));

    // Validate delivery radius if customer is doing delivery
    let deliveryFeeCents = 0;
    if (fulfilmentType === "DELIVERY") {
      if (!store.deliveryRadiusKm) {
        return NextResponse.json(
          { success: false, error: "This store does not offer delivery." },
          { status: 400 }
        );
      }

      // If store has a delivery radius and coordinates, require customer to use location
      if (store.lat && store.lng && !useMyLocation) {
        return NextResponse.json(
          {
            success: false,
            error: "Please use 'Use my location' to verify you are within the delivery radius.",
          },
          { status: 400 }
        );
      }

      // Calculate distance from store to delivery address
      if (deliveryLat !== null && deliveryLng !== null && store.lat && store.lng) {
        const { haversineKm } = await import("@/lib/geo");
        const distanceKm = haversineKm(
          { lat: store.lat, lng: store.lng },
          { lat: deliveryLat, lng: deliveryLng }
        );

        if (distanceKm > store.deliveryRadiusKm) {
          return NextResponse.json(
            {
              success: false,
              error: `Your delivery address is ${distanceKm.toFixed(1)}km away. This store only delivers within ${store.deliveryRadiusKm}km. Please choose a closer store or select collection.`,
            },
            { status: 400 }
          );
        }
      }

      // Apply delivery fee
      if (store.deliveryFeeCents) {
        deliveryFeeCents = store.deliveryFeeCents;
      }
    }

    // 3.5) Enforce phone verification if phone is provided
    if (phone) {
      // Check if already verified or need to start/complete verification
      const existingPhone = await prisma.phone.findFirst({
        where: { userId: user.id, phoneNumber: phone },
      });

      if (!existingPhone || !existingPhone.verified) {
        if (!phoneOtp) {
          // First attempt: start verification, send OTP, and tell client to show OTP field
          const result = await ensurePhoneVerifiedOrStartVerification({
            userId: user.id,
            fullName,
            phoneNumber: phone,
          });

          if (result.status === "verification_started") {
            return NextResponse.json(
              {
                success: false,
                code: "PHONE_VERIFICATION_REQUIRED",
                error:
                  "We sent a WhatsApp verification code to your number. Please enter it to continue.",
              },
              { status: 400 }
            );
          }
        } else {
          // Second attempt: verify OTP
          const verificationResult = await verifyPhoneOtp({
            userId: user.id,
            phoneNumber: phone,
            code: phoneOtp,
          });

          if (!verificationResult.ok) {
            const reason = verificationResult.reason;
            let errorMessage = "Invalid code. Please try again.";

            if (reason === "expired") {
              errorMessage =
                "Your verification code has expired. Request a new one by submitting again.";
            } else if (reason === "locked") {
              errorMessage =
                "Too many incorrect attempts. Please wait before trying again.";
            }

            return NextResponse.json(
              {
                success: false,
                code: "PHONE_VERIFICATION_FAILED",
                reason,
                error: errorMessage,
              },
              { status: 400 }
            );
          }

          // At this point, Phone should be marked verified.
        }
      }
    }

    // 4) Idempotency
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        return NextResponse.json({
          success: true,
          orderId: existing.id,
          redirectUrl: `/orders/${existing.id}`,
        });
      }
    }

    // 5) Create order
    let order;
    try {
      order = await createOrderFromPayload({
        storeId,
        items,
        fullName,
        phone,
        email,
        fulfilmentType,
        note,
        customerId: user.id,
        idempotencyKey,
        paymentMethod,
        deliveryAddress,
        deliveryLat,
        deliveryLng,
        deliveryFeeCents,
      });
    } catch (err: unknown) {
      if (
        idempotencyKey &&
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as any).code === "P2002"
      ) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey },
        });

        if (existing) {
          return NextResponse.json({
            success: true,
            orderId: existing.id,
            redirectUrl: `/orders/${existing.id}`,
          });
        }
      }

      throw err;
    }

    // 6) Handle online payment
    if (paymentMethod === "ONLINE_PAYMENT") {
      try {
        const session = await createOrderPaymentSession({
          amountCents: order.totalCents,
          successUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/orders/${order.id}`,
          cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout`,
          externalId: order.id,
          metadata: {
            orderId: order.id,
            storeId: order.storeId,
            type: "order_payment",
          },
        });

        // Store the checkout ID on the order for webhook reconciliation
        await prisma.order.update({
          where: { id: order.id },
          data: { 
            checkoutId: session.checkoutId,
          },
        });

        return NextResponse.json({
          success: true,
          redirectUrl: session.checkoutUrl,
        });
      } catch (err) {
        console.error("[orders] Failed to create payment session", err);
        // If payment session creation fails, delete the order and return error
        await prisma.order.delete({ where: { id: order.id } });
        return NextResponse.json(
          { success: false, error: "Failed to initiate payment. Please try again." },
          { status: 500 }
        );
      }
    }

    // 7) Clear cart (only for cash payments)
    await clearCartForUser(user.id);

    // 7) Enqueue confirmation email (unchanged)
    try {
      await enqueueOrderConfirmationEmail({
        tenantId: order.storeId,
        orderId: order.id,
        userId: user.id,
      });
    } catch (err) {
      console.error("[orders] Failed to enqueue confirmation email", err);
    }

    // 8) WhatsApp order confirmation (best effort)
    try {
      // You can await this, or fire-and-forget with `.catch(...)`
      await enqueueOrderConfirmationWhatsApp({
        orderId: order.id,
        userId: user.id,
      });
    } catch (err) {
      console.error(
        "[orders] Failed to enqueue WhatsApp order confirmation",
        err
      );
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      redirectUrl: `/orders/${order.id}`,
    });
  } catch (err) {
    console.error("Place order failed:", err);
    return NextResponse.json(
      { success: false, error: GENERIC_ERROR_MESSAGE },
      { status: 500 }
    );
  }
}

export async function GET() {
  const user = await getCurrentUserMinimal();

  if (!user) {
    return NextResponse.json(
      { success: false, cart: [], error: "Not authenticated" },
      { status: 401 }
    );
  }

  const cart = await getCartForUser(user.id);

  return NextResponse.json({
    success: true,
    cart: cart.items,
  });
}
