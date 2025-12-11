// src/lib/email.ts
import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (!smtpHost || !smtpUser || !smtpPass) {
  console.warn(
    "⚠️ SMTP env vars are missing (SMTP_HOST / SMTP_USER / SMTP_PASS). Emails will fail until set."
  );
}

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  // secure should match the port: true for 465, false for others
  secure: smtpPort === 465,
  auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
});

type SendOrderEmailArgs = {
  to: string;
  customerName: string;
  storeName: string;
  orderId: string;
  pickupCode: string;
  trackingToken: string;
  fulfilmentType: "COLLECTION" | "DELIVERY";
  items: {
    name: string;
    quantity: number;
    totalCents: number;
  }[];
  totalCents: number;
};

type SendOrderReadyEmailArgs = {
  to: string;
  customerName: string;
  storeName: string;
  orderId: string;
  pickupCode: string;
  fulfilmentType: "COLLECTION" | "DELIVERY";
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatPrice(cents: number) {
  return `R ${(cents / 100).toFixed(2)}`;
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Low-level sender: used by the QStash worker (and legacy functions)
export async function sendRawEmail(args: {
  to: string;
  subject: string;
  html: string;
}) {
  const { to, subject, html } = args;

  if (!smtpUser || !smtpHost || !smtpPass) {
    console.error(
      "sendRawEmail called but SMTP config is missing. Check SMTP env vars."
    );
    return;
  }

  await transporter.sendMail({
    from: smtpUser,
    to,
    subject,
    html,
  });
}

// ─────────────────────────────────────────────
// Builders – pure functions: subject + html
// ─────────────────────────────────────────────

export function buildOrderConfirmationEmail(
  args: SendOrderEmailArgs
): { subject: string; html: string } {
  const {
    customerName,
    storeName,
    orderId,
    pickupCode,
    fulfilmentType,
    items,
    totalCents,
    trackingToken,
  } = args;

  const safeCustomerName = escapeHtml(customerName);
  const safeStoreName = escapeHtml(storeName);

  const shortId = orderId.slice(-6);
  const subject =
    fulfilmentType === "COLLECTION"
      ? `Your Kasi Flavors collection order #${shortId}`
      : `Your Kasi Flavors delivery order #${shortId}`;

  const itemsHtml = items
    .map(
      (i) =>
        `<li>${i.quantity} × ${escapeHtml(
          i.name
        )} — <strong>${formatPrice(i.totalCents)}</strong></li>`
    )
    .join("");

  const baseUrl =
    process.env.BASE_URL ?? process.env.BASE_URL ?? "http://localhost:3000";
  const trackingLink = `${baseUrl.replace(/\/+$/, "")}/track/${trackingToken}`;

  const fulfilmentText =
    fulfilmentType === "COLLECTION"
      ? "You chose <strong>collection</strong>. When you arrive at the store, give them the code below to confirm your order."
      : "You chose <strong>delivery</strong>. When the driver arrives, they will ask for the code below to confirm your order.";

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(15,23,42,0.08);">
        <h1 style="margin: 0 0 8px; font-size: 20px; color: #0f172a;">Thank you for your order, ${safeCustomerName} 👋</h1>
        <p style="margin: 0 0 4px; font-size: 14px; color: #475569;">
          Your order at <strong>${safeStoreName}</strong> has been received.
        </p>
        <p style="margin: 0 0 16px; font-size: 12px; color: #64748b;">
          Order reference: <code style="background:#e2e8f0; padding:2px 6px; border-radius: 999px; font-size: 11px;">#${shortId}</code>
        </p>

        <div style="margin-bottom: 16px; padding: 12px 14px; background: #0f172a; border-radius: 10px; color: #e5e7eb;">
          <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color:#a5b4fc;">Your code</p>
          <p style="margin: 0 0 6px; font-size: 26px; letter-spacing: 0.3em; font-weight: 700;">${pickupCode}</p>
          <p style="margin: 0; font-size: 12px; color: #e5e7eb;">
            ${fulfilmentText}
          </p>
        </div>

        <div style="margin: 20px 0; text-align: center;">
          <a 
            href="${trackingLink}" 
            style="
              display: inline-block;
              background: #0f172a;
              color: #ffffff;
              padding: 10px 20px;
              border-radius: 8px;
              font-size: 13px;
              font-weight: 600;
              text-decoration: none;
            "
          >
            Track your order
          </a>
        </div>

        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color:#0f172a;">Items</p>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #0f172a;">
            ${itemsHtml}
          </ul>
        </div>

        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0; display:flex; justify-content: space-between; font-size: 13px;">
          <span style="color:#64748b;">Total</span>
          <strong style="color:#0f172a;">${formatPrice(totalCents)}</strong>
        </div>

        <p style="margin-top: 20px; font-size: 11px; color:#94a3b8;">
          Powered by Kasi Flavors · This email is for confirmation only. Please do not reply.
        </p>
      </div>
    </div>
  `;

  return { subject, html };
}

export function buildOrderReadyEmail(
  args: SendOrderReadyEmailArgs
): { subject: string; html: string } {
  const { customerName, storeName, orderId, pickupCode, fulfilmentType } = args;

  const safeCustomerName = escapeHtml(customerName);
  const safeStoreName = escapeHtml(storeName);

  const shortId = orderId.slice(-6);
  const isCollection = fulfilmentType === "COLLECTION";

  const subject = isCollection
    ? `Your order #${shortId} is ready for collection`
    : `Your order #${shortId} is out for delivery`;

  const message = isCollection
    ? `Your order at ${safeStoreName} is ready for collection. When you arrive at the store, give them this code to confirm your order:`
    : `Your order at ${safeStoreName} is on its way. When the driver arrives, they will ask for this code to confirm your order:`;

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 25px rgba(15,23,42,0.08);">
        <h1 style="margin: 0 0 8px; font-size: 20px; color: #0f172a;">
          Hi ${safeCustomerName}, your order is ready 🎉
        </h1>
        <p style="margin: 0 0 12px; font-size: 14px; color: #475569;">
          ${message}
        </p>

        <div style="margin-bottom: 16px; padding: 12px 14px; background: #0f172a; border-radius: 10px; color: #e5e7eb; text-align:center;">
          <p style="margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color:#a5b4fc;">Your code</p>
          <p style="margin: 0; font-size: 28px; letter-spacing: 0.3em; font-weight: 700;">${pickupCode}</p>
        </div>

        <p style="margin-top: 12px; font-size: 12px; color:#64748b;">
          Order reference: <code style="background:#e2e8f0; padding:2px 6px; border-radius: 999px; font-size: 11px;">#${shortId}</code>
        </p>

        <p style="margin-top: 20px; font-size: 11px; color:#94a3b8;">
          Powered by Kasi Flavors · This email is for information only. Please do not reply.
        </p>
      </div>
    </div>
  `;

  return { subject, html };
}

// ─────────────────────────────────────────────
// Legacy helpers – now implemented via builders + sendRawEmail
// ─────────────────────────────────────────────

export async function sendOrderConfirmationEmail(args: SendOrderEmailArgs) {
  try {
    const { subject, html } = buildOrderConfirmationEmail(args);
    await sendRawEmail({ to: args.to, subject, html });
  } catch (error) {
    console.error("sendOrderConfirmationEmail failed:", error);
  }
}

export async function sendOrderReadyEmail(args: SendOrderReadyEmailArgs) {
  try {
    const { subject, html } = buildOrderReadyEmail(args);
    await sendRawEmail({ to: args.to, subject, html });
  } catch (error) {
    console.error("sendOrderReadyEmail failed:", error);
  }
}
