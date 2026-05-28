// src/lib/email/templates.ts

import type {
  BuiltEmail,
  SendOrderEmailArgs,
  SendOrderReadyEmailArgs,
} from "./types";

function formatPrice(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getAppUrl() {
  const raw =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  const withScheme =
    raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `http://${raw}`;

  return withScheme.replace(/\/$/, "");
}

function getSafeFrom(fallbackFrom?: string | null) {
  return (
    process.env.FROM_EMAIL ||
    fallbackFrom ||
    `Kasi Flavors <${process.env.SMTP_USER || "support@kasiflavors.co.za"}>`
  );
}

function isCustomerFacingCode(code: string | null | undefined) {
  return Boolean(code && !code.startsWith("MANUAL-"));
}

function buildLayout({
  brandName,
  title,
  subtitle,
  body,
  poweredBy,
}: {
  brandName: string;
  title: string;
  subtitle: string;
  body: string;
  poweredBy: string;
}) {
  const logoUrl = `${getAppUrl()}/brand/kasi-flavors-logo.png`;

  return `
    <div style="margin:0;padding:0;background:#f6efdf;font-family:Arial,Helvetica,sans-serif;color:#111111;">
      <div style="max-width:680px;margin:0 auto;padding:28px 18px;">
        <div style="background:#fffdf8;border:1px solid rgba(17,17,17,0.10);border-radius:30px;overflow:hidden;">
          <div style="height:8px;background:linear-gradient(90deg,#006b2b 0%,#f47705 52%,#f9bd0b 100%);"></div>

          <div style="padding:30px 28px 24px;background:#111111;text-align:center;">
            <img
              src="${escapeHtml(logoUrl)}"
              alt="${escapeHtml(brandName)}"
              style="display:block;max-width:160px;width:100%;height:auto;margin:0 auto 20px;background:#ffffff;border-radius:18px;padding:10px;"
            />

            <div style="display:inline-block;background:#f9bd0b;color:#111111;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;padding:8px 14px;border-radius:999px;">
              ${escapeHtml(brandName)}
            </div>

            <h1 style="margin:18px 0 0;color:#ffffff;font-size:30px;line-height:1.1;font-weight:900;">
              ${escapeHtml(title)}
            </h1>

            <p style="margin:12px auto 0;max-width:480px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.65;font-weight:600;">
              ${escapeHtml(subtitle)}
            </p>
          </div>

          <div style="padding:30px 28px;background:#fffdf8;">
            ${body}

            <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">
              Regards,<br />
              <strong>${escapeHtml(brandName)} Team</strong>
            </p>
          </div>
        </div>

        <p style="text-align:center;margin:18px 0 0;color:#666666;font-size:12px;line-height:1.5;">
          ${escapeHtml(poweredBy)}
        </p>
      </div>
    </div>
  `;
}

function buildCodeBlock({
  label,
  code,
  instruction,
}: {
  label: string;
  code: string;
  instruction: string;
}) {
  return `
    <div style="margin:24px 0;padding:20px;border-radius:24px;background:#111111;color:#ffffff;text-align:center;">
      <p style="margin:0 0 8px;color:#f9bd0b;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;">
        ${escapeHtml(label)}
      </p>

      <p style="margin:0;font-family:monospace;font-size:32px;letter-spacing:0.28em;font-weight:900;color:#ffffff;">
        ${escapeHtml(code)}
      </p>

      <p style="margin:12px auto 0;max-width:420px;font-size:13px;line-height:1.55;color:rgba(255,255,255,0.72);font-weight:600;">
        ${instruction}
      </p>
    </div>
  `;
}

export function buildOrderConfirmationEmail(
  args: SendOrderEmailArgs,
): BuiltEmail {
  const {
    tenantConfig,
    to,
    customerName,
    storeName,
    orderId,
    pickupCode,
    fulfilmentType,
    items,
    totalCents,
    trackingToken,
  } = args;

  const brandName = tenantConfig.brandName || "Kasi Flavors";
  const poweredBy = tenantConfig.poweredBy ?? "Kasi Flavors · Skip the queue. Order online.";
  const shortId = orderId.slice(-6);

  const isCollection = fulfilmentType === "COLLECTION";

  const subject = isCollection
    ? `Your ${brandName} collection order #${shortId}`
    : `Your ${brandName} delivery order #${shortId}`;

  const trackingLink = trackingToken
    ? `${getAppUrl()}/track/${trackingToken}`
    : `${getAppUrl()}/orders/${orderId}`;

  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid rgba(17,17,17,0.08);font-size:14px;color:#111111;font-weight:700;">
            ${item.quantity} × ${escapeHtml(item.name)}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid rgba(17,17,17,0.08);font-size:14px;color:#111111;font-weight:900;text-align:right;">
            ${formatPrice(item.totalCents)}
          </td>
        </tr>
      `,
    )
    .join("");

  const codeInstruction = isCollection
    ? "When your order is ready for collection, give this code to the store to confirm your order."
    : "When the driver arrives, give this code to confirm your delivery.";

  const codeBlock = isCustomerFacingCode(pickupCode)
    ? buildCodeBlock({
        label: isCollection ? "Pickup code" : "Delivery code",
        code: pickupCode!,
        instruction: codeInstruction,
      })
    : "";

  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
      Hi <strong>${escapeHtml(customerName || "there")}</strong>,
    </p>

    <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
      Thank you for your order from <strong>${escapeHtml(storeName)}</strong>. Your order has been received.
    </p>

    <div style="margin:22px 0;padding:18px;border-radius:22px;background:#f6efdf;border:1px solid rgba(17,17,17,0.08);">
      <p style="margin:0;color:#006b2b;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
        Order reference
      </p>

      <p style="margin:8px 0 0;font-family:monospace;font-size:18px;font-weight:900;color:#111111;">
        #${escapeHtml(shortId)}
      </p>
    </div>

    ${codeBlock}

    <div style="text-align:center;margin:28px 0;">
      <a
        href="${escapeHtml(trackingLink)}"
        target="_blank"
        style="display:inline-block;background:#006b2b;color:#ffffff;text-decoration:none;font-weight:900;border-radius:999px;padding:15px 24px;font-size:15px;"
      >
        Track your order
      </a>
    </div>

    <div style="margin-top:24px;">
      <p style="margin:0 0 10px;font-size:13px;color:#555;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;">
        Items
      </p>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${itemsHtml}
      </table>
    </div>

    <div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(17,17,17,0.10);">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td style="font-size:16px;font-weight:900;color:#111111;">Total</td>
          <td style="font-size:20px;font-weight:900;color:#006b2b;text-align:right;">${formatPrice(totalCents)}</td>
        </tr>
      </table>
    </div>

    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#444444;">
      ${isCollection
        ? "The store will update your order status when it is ready for collection."
        : "You will be notified when your order is out for delivery."}
    </p>
  `;

  const html = buildLayout({
    brandName,
    title: "Your order is confirmed",
    subtitle: isCollection
      ? "Your collection order has been received."
      : "Your delivery order has been received.",
    body,
    poweredBy,
  });

  const text = `
Hi ${customerName || "there"},

Thank you for your order from ${storeName}. Your order has been received.

Order reference:
#${shortId}

${isCustomerFacingCode(pickupCode) ? `${isCollection ? "Pickup" : "Delivery"} code: ${pickupCode}` : ""}

Track your order:
${trackingLink}

Items:
${items.map((item) => `- ${item.quantity} x ${item.name}: ${formatPrice(item.totalCents)}`).join("\n")}

Total:
${formatPrice(totalCents)}

Regards,
${brandName} Team
`.trim();

  return {
    from: getSafeFrom(tenantConfig.from),
    replyTo: tenantConfig.replyTo,
    to,
    subject,
    html,
    
  };
}

export function buildOrderReadyEmail(args: SendOrderReadyEmailArgs): BuiltEmail {
  const {
    tenantConfig,
    to,
    customerName,
    storeName,
    orderId,
    pickupCode,
    fulfilmentType,
  } = args;

  const brandName = tenantConfig.brandName || "Kasi Flavors";
  const poweredBy = tenantConfig.poweredBy ?? "Kasi Flavors · Skip the queue. Order online.";
  const shortId = orderId.slice(-6);
  const isCollection = fulfilmentType === "COLLECTION";

  const subject = isCollection
    ? `Your order #${shortId} is ready for collection`
    : `Your order #${shortId} is out for delivery`;

  const title = isCollection
    ? "Your order is ready"
    : "Your order is on the way";

  const subtitle = isCollection
    ? "You can now collect your order from the store."
    : "Your delivery order is on the way.";

  const message = isCollection
    ? `Your order at <strong>${escapeHtml(storeName)}</strong> is ready for collection. When you arrive, give the store your pickup code.`
    : `Your order at <strong>${escapeHtml(storeName)}</strong> is on the way. When the driver arrives, give them your delivery code.`;

  const codeBlock = isCustomerFacingCode(pickupCode)
    ? buildCodeBlock({
        label: isCollection ? "Pickup code" : "Delivery code",
        code: pickupCode!,
        instruction: isCollection
          ? "Show this code at the store to confirm your collection."
          : "Give this code to the driver to confirm your delivery.",
      })
    : "";

  const body = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
      Hi <strong>${escapeHtml(customerName || "there")}</strong>,
    </p>

    <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
      ${message}
    </p>

    ${codeBlock}

    <div style="margin:22px 0;padding:18px;border-radius:22px;background:#f6efdf;border:1px solid rgba(17,17,17,0.08);">
      <p style="margin:0;color:#006b2b;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
        Order reference
      </p>

      <p style="margin:8px 0 0;font-family:monospace;font-size:18px;font-weight:900;color:#111111;">
        #${escapeHtml(shortId)}
      </p>
    </div>
  `;

  const html = buildLayout({
    brandName,
    title,
    subtitle,
    body,
    poweredBy,
  });

  const text = `
Hi ${customerName || "there"},

${isCollection
  ? `Your order at ${storeName} is ready for collection.`
  : `Your order at ${storeName} is on the way.`}

Order reference:
#${shortId}

${isCustomerFacingCode(pickupCode) ? `${isCollection ? "Pickup" : "Delivery"} code: ${pickupCode}` : ""}

Regards,
${brandName} Team
`.trim();

  return {
    from: getSafeFrom(tenantConfig.from),
    replyTo: tenantConfig.replyTo,
    to,
    subject,
    html,
  };
}