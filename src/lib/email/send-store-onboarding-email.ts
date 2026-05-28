// src/lib/email/send-store-onboarding-email.ts

import { createMailerTransport, getFromEmail } from "@/lib/email/mailer";

type SendStoreOnboardingEmailInput = {
  to: string;
  ownerName?: string | null;
  storeName: string;
  storeSlug: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendStoreOnboardingSuccessEmail({
  to,
  ownerName,
  storeName,
  storeSlug,
}: SendStoreOnboardingEmailInput) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const ownerDashboardUrl = `${appUrl}/owner/store/overview`;
  const menuUrl = `${appUrl}/stores/${storeSlug}`;
  const logoUrl = `${appUrl}/brand/kasi-flavors-logo.png`;

  const safeOwnerName = escapeHtml(ownerName?.trim() || "there");
  const safeStoreName = escapeHtml(storeName);
  const safeOwnerDashboardUrl = escapeHtml(ownerDashboardUrl);
  const safeMenuUrl = escapeHtml(menuUrl);
  const safeLogoUrl = escapeHtml(logoUrl);

  const subject = `${storeName} has been submitted to Kasi Flavors`;

  const html = `
    <div style="margin:0;padding:0;background:#f6efdf;font-family:Arial,Helvetica,sans-serif;color:#111111;">
      <div style="max-width:680px;margin:0 auto;padding:28px 18px;">
        <div style="background:#fffdf8;border:1px solid rgba(17,17,17,0.10);border-radius:30px;overflow:hidden;">
          <div style="height:8px;background:linear-gradient(90deg,#006b2b 0%,#f47705 52%,#f9bd0b 100%);"></div>

          <div style="padding:30px 28px 24px;background:#111111;text-align:center;">
            <img
              src="${safeLogoUrl}"
              alt="Kasi Flavors"
              style="display:block;max-width:160px;width:100%;height:auto;margin:0 auto 20px;background:#ffffff;border-radius:18px;padding:10px;"
            />

            <div style="display:inline-block;background:#f9bd0b;color:#111111;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;padding:8px 14px;border-radius:999px;">
              Store submitted
            </div>

            <h1 style="margin:18px 0 0;color:#ffffff;font-size:32px;line-height:1.08;font-weight:900;">
              Your onboarding was successful
            </h1>

            <p style="margin:12px auto 0;max-width:480px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.65;font-weight:600;">
              Your store has been submitted for review. Once approved, customers will be able to view your menu and place collection orders.
            </p>
          </div>

          <div style="padding:30px 28px;background:#fffdf8;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
              Hi <strong>${safeOwnerName}</strong>,
            </p>

            <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
              Thank you for onboarding <strong>${safeStoreName}</strong> on Kasi Flavors.
            </p>

            <div style="margin:24px 0;padding:20px;border-radius:24px;background:#f6efdf;border:1px solid rgba(17,17,17,0.08);">
              <p style="margin:0;color:#006b2b;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
                What happens next?
              </p>

              <p style="margin:10px 0 0;font-size:15px;line-height:1.65;color:#333333;font-weight:600;">
                The Kasi Flavors team will review your store details, menu, and location before making it visible to customers.
              </p>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:24px 0;">
              <div style="background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:18px;padding:14px;text-align:center;">
                <div style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:999px;background:#111111;color:#ffffff;font-weight:900;font-size:13px;">1</div>
                <p style="margin:9px 0 0;color:#006b2b;font-size:12px;font-weight:900;text-transform:uppercase;">Review</p>
                <p style="margin:4px 0 0;color:#555;font-size:12px;line-height:1.4;font-weight:600;">We check your store</p>
              </div>

              <div style="background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:18px;padding:14px;text-align:center;">
                <div style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:999px;background:#111111;color:#ffffff;font-weight:900;font-size:13px;">2</div>
                <p style="margin:9px 0 0;color:#006b2b;font-size:12px;font-weight:900;text-transform:uppercase;">Approve</p>
                <p style="margin:4px 0 0;color:#555;font-size:12px;line-height:1.4;font-weight:600;">Your store goes live</p>
              </div>

              <div style="background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:18px;padding:14px;text-align:center;">
                <div style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:999px;background:#111111;color:#ffffff;font-weight:900;font-size:13px;">3</div>
                <p style="margin:9px 0 0;color:#006b2b;font-size:12px;font-weight:900;text-transform:uppercase;">QR Poster</p>
                <p style="margin:4px 0 0;color:#555;font-size:12px;line-height:1.4;font-weight:600;">Sent after approval</p>
              </div>
            </div>

            <div style="text-align:center;margin:28px 0;">
              <a
                href="${safeOwnerDashboardUrl}"
                target="_blank"
                style="display:inline-block;background:#006b2b;color:#ffffff;text-decoration:none;font-weight:900;border-radius:999px;padding:15px 24px;font-size:15px;"
              >
                Open owner dashboard
              </a>
            </div>

            <div style="border-top:1px solid rgba(17,17,17,0.08);padding-top:20px;margin-top:24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#555;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;">
                Store menu link
              </p>

              <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;">
                <a href="${safeMenuUrl}" target="_blank" style="color:#006b2b;font-weight:800;">
                  ${safeMenuUrl}
                </a>
              </p>

              <p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#777;">
                This link will be useful once your store is approved.
              </p>
            </div>

            <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#444444;">
              You can continue preparing your store while it is under review. Make sure your menu, prices, location, and opening status are correct.
            </p>

            <p style="margin:24px 0 0;font-size:15px;line-height:1.6;">
              Regards,<br />
              <strong>Kasi Flavors Team</strong>
            </p>
          </div>
        </div>

        <p style="text-align:center;margin:18px 0 0;color:#666666;font-size:12px;line-height:1.5;">
          Kasi Flavors · Skip the queue. Order online.
        </p>
      </div>
    </div>
  `;

  const text = `
Hi ${ownerName?.trim() || "there"},

Thank you for onboarding ${storeName} on Kasi Flavors.

Your store has been submitted for review. Once approved, customers will be able to view your menu and place collection orders.

What happens next:
1. The Kasi Flavors team reviews your store.
2. If approved, your store goes live.
3. Your printable QR poster will be sent after approval.

Owner dashboard:
${ownerDashboardUrl}

Store menu link:
${menuUrl}

This link will be useful once your store is approved.

Regards,
Kasi Flavors Team

Kasi Flavors · Skip the queue. Order online.
  `.trim();

  const transport = createMailerTransport();

  return transport.sendMail({
    from: getFromEmail(),
    to,
    subject,
    html,
    text,
  });
}