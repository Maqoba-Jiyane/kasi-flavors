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
import { enqueueOrderConfirmationWhatsApp } from "@/lib/queues/whatsappQueue";
// no more: import { sendOrderConfirmationEmail } from "@/lib/email";
// no direct qstash imports here

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
    const note = ((form.get("note") as string) || "").trim();

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

    const items = cart.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
    }));

    // 3.5) Enforce phone verification if phone is provided
    if (phone) {
      // Check if already verified or need to start/complete verification
      const existingPhone = await prisma.phone.findFirst({
        where: { userId: user.id, phoneNumber: phone.charAt(0) },
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

    // 6) Clear cart
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
