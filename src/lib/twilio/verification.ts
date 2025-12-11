// lib/twilio/verification.ts
import { getTwilioClient } from "./client";

const WHATSAPP_MODE =
  process.env.TWILIO_WHATSAPP_MODE === "production" ? "production" : "sandbox";

// Sandbox config (dev)
const WHATSAPP_SANDBOX_FROM = process.env.TWILIO_WHATSAPP_SANDBOX_FROM; // e.g. 'whatsapp:+14155238886'

// Production config (later)
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;
const WHATSAPP_VERIFICATION_CONTENT_SID =
  process.env.TWILIO_VERIFICATION_CONTENT_SID;

if (WHATSAPP_MODE === "sandbox" && !WHATSAPP_SANDBOX_FROM) {
  console.warn(
    "⚠️ TWILIO_WHATSAPP_MODE=sandbox but TWILIO_WHATSAPP_SANDBOX_FROM is not set."
  );
}

if (WHATSAPP_MODE === "production") {
  if (!WHATSAPP_FROM || !WHATSAPP_VERIFICATION_CONTENT_SID) {
    console.warn(
      "⚠️ TWILIO_WHATSAPP_MODE=production but TWILIO_WHATSAPP_FROM or TWILIO_VERIFICATION_CONTENT_SID is missing."
    );
  }
}

export async function sendPhoneVerificationOtpWhatsApp(args: {
  toPhone: string;
  code: string;
  firstName?: string | null;
}) {
  const { toPhone, code, firstName } = args;
  const client = getTwilioClient();

  try {
    if (WHATSAPP_MODE === "sandbox") {
      if (!WHATSAPP_SANDBOX_FROM) {
        throw new Error("WhatsApp sandbox from number not configured");
      }

      // Simple text body for sandbox
      const body = `Hi ${
        firstName ?? ""
      }, your Kasi Flavors verification code is ${code}.`;

      const message = await client.messages.create({
        from: WHATSAPP_SANDBOX_FROM, // e.g. 'whatsapp:+14155238886'
        to: `whatsapp:${toPhone}`,    // e.g. 'whatsapp:+2779....'
        body,
      });

      if (process.env.NODE_ENV !== "production") {
        console.info("[whatsapp] sandbox OTP sent", {
          sid: message.sid,
          status: message.status,
        });
      }

      return message;
    }

    // PRODUCTION: use contentSid + contentVariables
    if (!WHATSAPP_FROM || !WHATSAPP_VERIFICATION_CONTENT_SID) {
      throw new Error("WhatsApp verification not configured for production");
    }

    const contentVariables = JSON.stringify({
      // Assuming template like: "Hi {{1}}, your Kasi Flavors code is {{2}}"
      "1": firstName ?? "",
      "2": code,
    });

    const message = await client.messages.create({
      from: WHATSAPP_FROM,
      to: `whatsapp:${toPhone}`,
      contentSid: WHATSAPP_VERIFICATION_CONTENT_SID,
      contentVariables,
    });

    if (process.env.NODE_ENV !== "production") {
      console.info("[whatsapp] production OTP sent", {
        sid: message.sid,
        status: message.status,
      });
    }

    return message;
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[whatsapp] Twilio error (dev)", {
        message: err?.message,
        code: err?.code,
        status: err?.status,
        moreInfo: err?.moreInfo,
        raw: err,
      });
    } else {
      console.error("[whatsapp] failed to send verification OTP", {
        message: err?.message,
        code: err?.code,
        status: err?.status,
      });
    }

    throw err;
  }
}
