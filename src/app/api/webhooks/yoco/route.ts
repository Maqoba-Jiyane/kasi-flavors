// app/api/yoco-webhook/route.ts
import { NextRequest } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { LedgerStatus, LedgerType } from "@prisma/client";

export const runtime = "nodejs";

// ---- Helpers ---------------------------------------------------------------

const WINDOW_SECONDS = 3 * 60; // 3 minutes clock skew tolerance

function extractV1Signatures(header: string): string[] {
  // Accept: "v1,BASE64 v1,BASE64"
  return header
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [ver, sig] = chunk.split(",", 2);
      return ver?.toLowerCase() === "v1" && sig ? sig.trim() : null;
    })
    .filter((s): s is string => !!s);
}

// ---- Handler ---------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // 1) Signature headers
    const id = req.headers.get("webhook-id");
    const ts = req.headers.get("webhook-timestamp");
    const sigHeader = req.headers.get("webhook-signature");

    if (!id || !ts || !sigHeader) {
      console.warn("[Yoco webhook] missing signature headers");
      return new Response("Missing signature headers", { status: 400 });
    }

    const now = Math.floor(Date.now() / 1000);
    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum) || tsNum + WINDOW_SECONDS < now) {
      console.warn("[Yoco webhook] request expired", { ts, now });
      return new Response("Request expired", { status: 400 });
    }

    // 2) Get raw body (BYTES, not parsed JSON)
    const rawBuf = Buffer.from(await req.arrayBuffer());
    const prefix = Buffer.from(`${id}.${ts}.`, "utf8");
    const signedBytes = Buffer.concat([prefix, rawBuf]);

    // 3) Build expected signature from Yoco webhook secret
    const fullSecret = process.env.WEBHOOK_SECRET;
    if (!fullSecret || !fullSecret.startsWith("whsec_")) {
      console.error(
        "[Yoco webhook] Server misconfigured: WEBHOOK_SECRET missing or invalid",
      );
      return new Response("Server misconfigured", { status: 500 });
    }

    const secretBytes = Buffer.from(fullSecret.split("_")[1], "base64");
    const expected = crypto
      .createHmac("sha256", secretBytes)
      .update(signedBytes)
      .digest("base64");

    // 4) Compare against any v1 signature (timing-safe)
    const candidates = extractV1Signatures(sigHeader);
    const ok = candidates.some((sig) => {
      const a = Buffer.from(expected);
      const b = Buffer.from(sig);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });

    if (!ok) {
      console.warn("[Yoco webhook] signature mismatch", { id, ts });
      return new Response("Invalid signature", { status: 400 });
    }

    // 5) Verified — parse JSON now
    const body = JSON.parse(rawBuf.toString("utf8")) as {
      type?: string; // e.g. "payment.succeeded"
      payload?: {
        id?: string; // payment/checkout id from Yoco
        metadata?: {
          topupId?: string;
          storeId?: string;
          ownerId?: string;
          type?: string;
        };
      };
    };

    const eventType = body.type ?? "";
    const checkoutIdFromPayload = body.payload?.id ?? null;
    const metadata = body.payload?.metadata ?? {};
    const topupIdFromMetadata = metadata.topupId ?? null;

    if (!checkoutIdFromPayload && !topupIdFromMetadata) {
      console.warn("[Yoco webhook] missing identifiers", {
        eventType,
        checkoutIdFromPayload,
        topupIdFromMetadata,
      });
      return new Response("Missing identifiers", { status: 400 });
    }

    // 6) Find the ledger entry for this topup
    // Primary: metadata.topupId; fallback: checkoutId
    let entry = null;

    if (topupIdFromMetadata) {
      entry = await prisma.ledgerEntry.findUnique({
        where: { id: topupIdFromMetadata },
        include: { store: true },
      });
    }

    if (!entry && checkoutIdFromPayload) {
      entry = await prisma.ledgerEntry.findFirst({
        where: {
          checkoutId: checkoutIdFromPayload,
          type: LedgerType.TOPUP,
        },
        include: { store: true },
      });
    }

    if (!entry) {
      console.warn("[Yoco webhook] ledger entry not found for topup", {
        eventType,
        topupIdFromMetadata,
        checkoutIdFromPayload,
      });
      // Return 200 so Yoco doesn't keep retrying forever.
      return new Response("OK", { status: 200 });
    }

    // 7) Idempotency: if already COMPLETED, do nothing
    if (entry.status === LedgerStatus.COMPLETED) {
      return new Response("OK", { status: 200 });
    }

    // 8) Handle event types
    if (eventType === "payment.succeeded") {
      // Topup successful: mark ledger entry as COMPLETED
      // and increase store.creditCents by amountCents
      await prisma.$transaction(async (tx) => {
        const store = await tx.store.findUnique({
          where: { id: entry.storeId },
        });

        if (!store) {
          // Store missing; mark failed but don't crash webhook
          await tx.ledgerEntry.update({
            where: { id: entry.id },
            data: {
              status: LedgerStatus.FAILED,
              note: "Store not found while applying topup.",
            },
          });
          return;
        }

        const currentBalance = store.creditCents ?? 0;
        const newBalance = currentBalance + entry.amountCents;

        await tx.store.update({
          where: { id: store.id },
          data: {
            creditCents: newBalance,
          },
        });

        await tx.ledgerEntry.update({
          where: { id: entry.id },
          data: {
            status: LedgerStatus.COMPLETED,
            balanceCents: newBalance,
            provider: "YOCO",
            checkoutId: entry.checkoutId ?? checkoutIdFromPayload ?? undefined,
          },
        });
      });
    } else if (
      eventType === "payment.failed" ||
      eventType === "payment.canceled"
    ) {
      // Mark the topup as failed; do not adjust balance
      await prisma.ledgerEntry.update({
        where: { id: entry.id },
        data: {
          status: LedgerStatus.FAILED,
          provider: "YOCO",
          checkoutId: entry.checkoutId ?? checkoutIdFromPayload ?? undefined,
        },
      });
    } else {
      // Unknown/ignored event — log for debugging but don't change balance
      console.log("[Yoco webhook] Ignored event type", {
        eventType,
        topupId: entry.id,
      });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("🚨 Yoco Webhook Processing Error:", err);
    // In production you may want to still return 2xx to avoid endless retries.
    return new Response("OK", { status: 200 });
  }
}
