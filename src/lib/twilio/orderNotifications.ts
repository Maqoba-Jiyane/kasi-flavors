// lib/twilio/orderNotifications.ts
import { getTwilioClient } from "./client";

const WHATSAPP_MODE =
  process.env.TWILIO_WHATSAPP_MODE === "production" ? "production" : "sandbox";

const WHATSAPP_SANDBOX_FROM = process.env.TWILIO_WHATSAPP_SANDBOX_FROM;

// Optional for production Content API (later)
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const WHATSAPP_ORDER_STATUS_CONTENT_SID =
  process.env.TWILIO_ORDER_STATUS_CONTENT_SID;

type OrderReadyWhatsAppArgs = {
  toPhone: string;
  customerName: string;
  storeName: string;
  shortOrderId: string; // last 6 chars
  pickupCode?: string | null;
  fulfilmentType: "COLLECTION" | "DELIVERY";
  status: "READY_FOR_COLLECTION" | "OUT_FOR_DELIVERY";
};

export async function sendOrderReadyWhatsApp(
  args: OrderReadyWhatsAppArgs
) {
  const {
    toPhone,
    customerName,
    storeName,
    shortOrderId,
    pickupCode,
    fulfilmentType,
    status,
  } = args;

  try {
    const client = getTwilioClient();

    if (WHATSAPP_MODE === "sandbox") {
      if (!WHATSAPP_SANDBOX_FROM) {
        throw new Error("WhatsApp sandbox from number not configured");
      }

      const isCollection = fulfilmentType === "COLLECTION";

      const lines: string[] = [
        `Hi ${customerName || "there"}, 👋`,
      ];

      if (status === "READY_FOR_COLLECTION") {
        lines.push(
          `Your order ${shortOrderId} at ${storeName} is now *ready for collection*.`
        );

        if (isCollection && pickupCode) {
          lines.push(`Your pickup code is: *${pickupCode}*.`);
        }

        if (isCollection && !pickupCode) {
          lines.push(`Show this message at the counter when you arrive.`);
        }
      } else if (status === "OUT_FOR_DELIVERY") {
        lines.push(
          `Your order ${shortOrderId} from ${storeName} is *out for delivery*.`
        );
      }

      lines.push("");
      lines.push("Thank you for ordering with Kasi Flavors. 🍽️");

      const body = lines.join("\n");

      const message = await client.messages.create({
        from: WHATSAPP_SANDBOX_FROM,
        to: `whatsapp:${toPhone}`,
        body,
      });

      if (process.env.NODE_ENV !== "production") {
        console.info("[whatsapp] sandbox order ready notification sent", {
          sid: message.sid,
          status: message.status,
        });
      }

      return message;
    }

    // PRODUCTION: Content API path (optional, later)
    if (!WHATSAPP_FROM || !WHATSAPP_ORDER_STATUS_CONTENT_SID) {
      throw new Error(
        "WhatsApp order status not configured for production"
      );
    }

    const isCollection = fulfilmentType === "COLLECTION";

    const contentVariables = JSON.stringify({
      // Adjust indices / keys to match your Twilio template
      "1": customerName || "",
      "2": storeName,
      "3": shortOrderId,
      "4": status === "READY_FOR_COLLECTION" ? "Ready for collection" : "Out for delivery",
      "5": isCollection && pickupCode ? pickupCode : "",
    });

    const message = await client.messages.create({
      from: WHATSAPP_FROM,
      to: `whatsapp:${toPhone}`,
      contentSid: WHATSAPP_ORDER_STATUS_CONTENT_SID,
      contentVariables,
    });

    if (process.env.NODE_ENV !== "production") {
      console.info("[whatsapp] production order ready notification sent", {
        sid: message.sid,
        status: message.status,
      });
    }

    return message;
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[whatsapp] order ready error (dev)", {
        message: err?.message,
        code: err?.code,
        status: err?.status,
        moreInfo: err?.moreInfo,
      });
    } else {
      console.error("[whatsapp] failed to send order ready notification", {
        message: err?.message,
        code: err?.code,
        status: err?.status,
      });
    }

    throw err;
  }
}

const WHATSAPP_ORDER_CONFIRMATION_CONTENT_SID =
  process.env.TWILIO_ORDER_CONFIRMATION_CONTENT_SID;

type OrderConfirmationArgs = {
  toPhone: string;
  customerName: string;
  storeName: string;
  shortOrderId: string; // last 6 chars
  fulfilmentType: "COLLECTION" | "DELIVERY";
};

export async function sendOrderConfirmationWhatsApp(
  args: OrderConfirmationArgs
) {
  const { toPhone, customerName, storeName, shortOrderId, fulfilmentType } =
    args;

  try {
    const client = getTwilioClient();

    if (WHATSAPP_MODE === "sandbox") {
      if (!WHATSAPP_SANDBOX_FROM) {
        throw new Error("WhatsApp sandbox from number not configured");
      }

      const bodyLines = [
        `Hi ${customerName || "there"}, 👋`,
        `We've received your order ${shortOrderId} at ${storeName}.`,
        fulfilmentType === "COLLECTION"
          ? "You'll collect from the store once it's ready."
          : "We'll let you know when it's out for delivery.",
        "",
        "You'll receive another WhatsApp update when the status changes.",
      ];

      const message = await client.messages.create({
        from: WHATSAPP_SANDBOX_FROM,
        to: `whatsapp:${toPhone}`,
        body: bodyLines.join("\n"),
      });

      if (process.env.NODE_ENV !== "production") {
        console.info("[whatsapp] sandbox order confirmation sent", {
          sid: message.sid,
          status: message.status,
        });
      }

      return message;
    }

    // PRODUCTION path with Content API (optional / later)
    if (!WHATSAPP_FROM || !WHATSAPP_ORDER_CONFIRMATION_CONTENT_SID) {
      throw new Error(
        "WhatsApp order confirmation not configured for production"
      );
    }

    const contentVariables = JSON.stringify({
      // Example mapping: tweak to match your template
      "1": customerName || "",
      "2": storeName,
      "3": shortOrderId,
      "4": fulfilmentType === "COLLECTION" ? "Collection" : "Delivery",
    });

    const message = await client.messages.create({
      from: WHATSAPP_FROM,
      to: `whatsapp:${toPhone}`,
      contentSid: WHATSAPP_ORDER_CONFIRMATION_CONTENT_SID,
      contentVariables,
    });

    if (process.env.NODE_ENV !== "production") {
      console.info("[whatsapp] production order confirmation sent", {
        sid: message.sid,
        status: message.status,
      });
    }

    return message;
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[whatsapp] order confirmation error (dev)", {
        message: err?.message,
        code: err?.code,
        status: err?.status,
        moreInfo: err?.moreInfo,
      });
    } else {
      console.error("[whatsapp] failed to send order confirmation", {
        message: err?.message,
        code: err?.code,
        status: err?.status,
      });
    }

    throw err;
  }
}
