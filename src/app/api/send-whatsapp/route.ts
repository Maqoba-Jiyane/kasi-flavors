// app/api/send-whatsapp/route.ts
import { NextResponse } from "next/server";
import twilio from "twilio";

export const runtime = "nodejs"; // ensure Node runtime (not edge) because twilio Node SDK uses sockets

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM, // e.g. "whatsapp:+14155238886"
} = process.env;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
  // This module may be imported during build; do not throw here — runtime check will handle it.
  // But it's useful to surface in logs during development.
  // (Don't log secrets.)
  // You can optionally throw here during runtime if you prefer.
}

const client = twilio(TWILIO_ACCOUNT_SID as string, TWILIO_AUTH_TOKEN as string);

type RequestBody = {
  to: string; // e.g. "whatsapp:+27794852263"
  contentSid: string; // Twilio content/template SID
  contentVariables?: Record<string, string> | string; // JSON or object
};

/**
 * POST /api/send-whatsapp
 * Body JSON: { to, contentSid, contentVariables }
 */
export async function POST(req: Request) {
  try {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
      return NextResponse.json(
        { error: "Server not configured: missing Twilio env vars" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as RequestBody;

    // Basic validation
    if (!body?.to || !body?.contentSid) {
      return NextResponse.json(
        { error: "Missing required fields: to, contentSid" },
        { status: 400 }
      );
    }

    // If contentVariables provided as object, convert to JSON string.
    const contentVariables =
      typeof body.contentVariables === "string"
        ? body.contentVariables
        : JSON.stringify(body.contentVariables ?? {});

    const message = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: body.to,
      contentSid: body.contentSid,
      contentVariables,
    });

    // Return only non-sensitive info
    return NextResponse.json({ sid: message.sid, status: message.status });
  } catch (err) {
    // Avoid leaking Twilio auth or stack traces to clients.
    // Log full error only on server logs (example below). In production, use structured logger.

    if(err instanceof Error)
    console.error("Failed to send WhatsApp message", {
      message: err?.message ?? err,
      // Do not include err.stack or err.details if they may contain sensitive info
    });

    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
