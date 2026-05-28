import { createMailerTransport, getFromEmail } from "@/lib/email/mailer";
import { generateStoreMenuPosterPdf } from "@/lib/pdf/store-menu-poster";

type SendStoreApprovedEmailInput = {
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

export async function sendStoreApprovedEmail({
  to,
  ownerName,
  storeName,
  storeSlug,
}: SendStoreApprovedEmailInput) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const menuUrl = `${appUrl}/stores/${storeSlug}`;

  const poster = await generateStoreMenuPosterPdf({
    storeName,
    storeSlug,
    menuUrl,
  });

  const safeOwnerName = escapeHtml(ownerName?.trim() || "there");
  const safeStoreName = escapeHtml(storeName);
  const safeMenuUrl = escapeHtml(menuUrl);

  const subject = `${storeName} is now live on Kasi Flavors`;

const html = `
  <div style="margin:0;padding:0;background:#f6efdf;font-family:Arial,Helvetica,sans-serif;color:#111111;">
    <div style="max-width:680px;margin:0 auto;padding:28px 18px;">
      
      <div style="background:#fffdf8;border:1px solid rgba(17,17,17,0.10);border-radius:30px;overflow:hidden;">
        
        <div style="height:8px;background:linear-gradient(90deg,#006b2b 0%,#f47705 52%,#f9bd0b 100%);"></div>

        <div style="padding:30px 28px 24px;background:#111111;text-align:center;">
          <img
            src="${process.env.NEXT_PUBLIC_APP_URL}/brand/kasi-flavors-logo.png"
            alt="Kasi Flavors"
            style="display:block;max-width:160px;width:100%;height:auto;margin:0 auto 20px;background:#ffffff;border-radius:18px;padding:10px;"
          />

          <div style="display:inline-block;background:#f9bd0b;color:#111111;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;padding:8px 14px;border-radius:999px;">
            Store approved
          </div>

          <h1 style="margin:18px 0 0;color:#ffffff;font-size:32px;line-height:1.08;font-weight:900;">
            Your store is now live
          </h1>

          <p style="margin:12px auto 0;max-width:480px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.65;font-weight:600;">
            Customers can now view your digital menu and place collection orders when your store is open.
          </p>
        </div>

        <div style="padding:30px 28px;background:#fffdf8;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
            Hi <strong>${safeOwnerName}</strong>,
          </p>

          <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
            Good news — <strong>${safeStoreName}</strong> has been approved and is now live on Kasi Flavors.
          </p>

          <div style="margin:24px 0;padding:20px;border-radius:24px;background:#f6efdf;border:1px solid rgba(17,17,17,0.08);">
            <p style="margin:0;color:#006b2b;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
              Printable QR poster attached
            </p>

            <p style="margin:10px 0 0;font-size:15px;line-height:1.65;color:#333333;font-weight:600;">
              Print the attached A4 poster and place it where customers can scan it. The QR code opens your digital menu directly.
            </p>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:24px 0;">
            <div style="background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:18px;padding:14px;text-align:center;">
              <div style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:999px;background:#111111;color:#ffffff;font-weight:900;font-size:13px;">1</div>
              <p style="margin:9px 0 0;color:#006b2b;font-size:12px;font-weight:900;text-transform:uppercase;">Print</p>
              <p style="margin:4px 0 0;color:#555;font-size:12px;line-height:1.4;font-weight:600;">Use the attached poster</p>
            </div>

            <div style="background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:18px;padding:14px;text-align:center;">
              <div style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:999px;background:#111111;color:#ffffff;font-weight:900;font-size:13px;">2</div>
              <p style="margin:9px 0 0;color:#006b2b;font-size:12px;font-weight:900;text-transform:uppercase;">Display</p>
              <p style="margin:4px 0 0;color:#555;font-size:12px;line-height:1.4;font-weight:600;">Place it where customers can scan</p>
            </div>

            <div style="background:#ffffff;border:1px solid rgba(17,17,17,0.08);border-radius:18px;padding:14px;text-align:center;">
              <div style="display:inline-block;width:28px;height:28px;line-height:28px;border-radius:999px;background:#111111;color:#ffffff;font-weight:900;font-size:13px;">3</div>
              <p style="margin:9px 0 0;color:#006b2b;font-size:12px;font-weight:900;text-transform:uppercase;">Collect</p>
              <p style="margin:4px 0 0;color:#555;font-size:12px;line-height:1.4;font-weight:600;">Customers order and collect</p>
            </div>
          </div>

          <div style="text-align:center;margin:28px 0;">
            <a
              href="${safeMenuUrl}"
              target="_blank"
              style="display:inline-block;background:#006b2b;color:#ffffff;text-decoration:none;font-weight:900;border-radius:999px;padding:15px 24px;font-size:15px;"
            >
              View your live menu
            </a>
          </div>

          <div style="border-top:1px solid rgba(17,17,17,0.08);padding-top:20px;margin-top:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#555;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;">
              Menu link
            </p>

            <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;">
              <a href="${safeMenuUrl}" target="_blank" style="color:#006b2b;font-weight:800;">
                ${safeMenuUrl}
              </a>
            </p>
          </div>

          <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#444444;">
            Keep your menu updated and make sure your store is open when you are accepting orders.
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

Good news — ${storeName} has been approved and is now live on Kasi Flavors.

Customers can now view your digital menu and place collection orders when your store is open.

We attached a printable A4 QR code poster. Print it and place it where customers can scan it to open your menu.

Your menu link:
${menuUrl}

Keep your store menu updated, make sure your store is open when you are accepting orders, and place the QR poster where customers can easily scan it.

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
    attachments: [
      {
        filename: poster.filename,
        content: poster.content,
        contentType: "application/pdf",
      },
    ],
  });
}
