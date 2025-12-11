// lib/twilio/client.ts
import twilio, { Twilio } from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.warn("⚠️ Twilio credentials are not set. WhatsApp verification will fail.");
}

let twilioClient: Twilio | null = null;

export function getTwilioClient(): Twilio {
  if (!twilioClient) {
    if (!accountSid || !authToken) {
      throw new Error("Twilio not configured");
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}
