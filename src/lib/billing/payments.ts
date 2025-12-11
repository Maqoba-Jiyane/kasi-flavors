// src/lib/payments.ts

type CreateTopupSessionArgs = {
    amountCents: number;
    currency?: "ZAR"; // Yoco currently supports ZAR only
    /**
     * Where Yoco should send the user after payment succeeds.
     * IMPORTANT: Do not use this as the source of truth for success;
     * confirm via webhook instead (Yoco recommendation).
     */
    successUrl: string;
    /**
     * Where to send the user if they cancel or if payment fails.
     */
    cancelUrl?: string;
    /**
     * Optional external ID / reference for reconciliation (e.g. topup ID).
     */
    externalId?: string;
    /**
     * Metadata to store on the Yoco checkout for later reconciliation.
     */
    metadata?: Record<string, string>;
  };
  
  /**
   * Response shape from Yoco Checkout "create checkout".
   * https://payments.yoco.com/api/checkouts
   */
  type YocoCheckoutResponse = {
    id: string;
    status: string;
    amount: number;
    currency: string;
    redirectUrl: string;
    paymentId: string | null;
    successUrl?: string | null;
    cancelUrl?: string | null;
    failureUrl?: string | null;
    metadata?: Record<string, unknown> | null;
    // ...other fields Yoco may add
  };
  
  export type TopupSession = {
    checkoutId: string;
    checkoutUrl: string;
  };
  
  /**
   * Creates a Yoco Checkout session for a topup.
   *
   * This should ONLY be called from the server (never the browser),
   * because it uses your secret API key.
   */
  export async function createTopupSession(
    args: CreateTopupSessionArgs,
  ): Promise<TopupSession> {
    const {
      amountCents,
      currency = "ZAR",
      successUrl,
      cancelUrl,
      externalId,
      metadata,
    } = args;
  
    if (!process.env.YOCO_SECRET_KEY) {
      throw new Error(
        "YOCO_SECRET_KEY is not set. Please configure it in your environment.",
      );
    }
  
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error("amountCents must be a positive integer (cents).");
    }
  
    const payload: Record<string, unknown> = {
      amount: amountCents,
      currency,
      successUrl,
    };
  
    if (cancelUrl) payload.cancelUrl = cancelUrl;
    if (externalId) payload.externalId = externalId;
    if (metadata) payload.metadata = metadata;
  
    const res = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.YOCO_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  
    if (!res.ok) {
      // Avoid logging PII, but log context so you can debug.
      const text = await res.text().catch(() => "Unable to read error body");
      console.error("[yoco] Failed to create checkout", {
        status: res.status,
        body: text,
      });
      throw new Error("Failed to create Yoco checkout session.");
    }
  
    const data = (await res.json()) as YocoCheckoutResponse;
  
    if (!data.redirectUrl || !data.id) {
      console.error("[yoco] Unexpected checkout response", data);
      throw new Error("Invalid Yoco checkout response.");
    }
  
    return {
      checkoutId: data.id,
      checkoutUrl: data.redirectUrl,
    };
  }
  