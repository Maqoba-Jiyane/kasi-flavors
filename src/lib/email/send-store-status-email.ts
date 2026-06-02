//src/lib/email/send-store-status-email.ts

import { createMailerTransport, getFromEmail } from "@/lib/email/mailer";
import { generateStoreMenuPosterPdf } from "@/lib/pdf/store-menu-poster";
import {
  buildStoreStatusEmailHtml,
  safeHtml,
} from "@/lib/email/store-status-email-template";
import type { StoreApprovalStatus } from "@prisma/client";

type SendStoreStatusEmailInput = {
  to: string;
  ownerName?: string | null;
  storeName: string;
  storeSlug: string;
  status: StoreApprovalStatus;
  reason?: string | null;
};

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function buildTextEmail({
  ownerName,
  storeName,
  status,
  menuUrl,
  ownerDashboardUrl,
  reason,
}: {
  ownerName?: string | null;
  storeName: string;
  status: StoreApprovalStatus;
  menuUrl: string;
  ownerDashboardUrl: string;
  reason?: string | null;
}) {
  const name = ownerName?.trim() || "there";

  if (status === "APPROVED") {
    return `
Hi ${name},

Good news — ${storeName} has been approved and is now live on Kasi Flavors.

Customers can now view your digital menu and place collection orders when your store is open.

We attached a printable A4 QR code poster. Print it and place it where customers can scan it to open your menu.

Your menu link:
${menuUrl}

Keep your menu updated and make sure your store is open when you are accepting orders.

Regards,
Kasi Flavors Team

Kasi Flavors · Skip the queue. Order online.
`.trim();
  }

  if (status === "REJECTED") {
    return `
Hi ${name},

Your store submission for ${storeName} needs changes before it can go live on Kasi Flavors.

Reason:
${reason || "No specific reason was provided."}

Please update your store details and submit it again for review.

Owner dashboard:
${ownerDashboardUrl}

Regards,
Kasi Flavors Team
`.trim();
  }

  if (status === "DEACTIVATED") {
    return `
Hi ${name},

Your store, ${storeName}, has been temporarily deactivated on Kasi Flavors.

This means customers cannot currently place orders from your store.

Reason:
${reason || "No specific reason was provided."}

Please review your store details or contact Kasi Flavors support if you believe this was a mistake.

Owner dashboard:
${ownerDashboardUrl}

Regards,
Kasi Flavors Team
`.trim();
  }

  return `
Hi ${name},

Your store, ${storeName}, has been moved back to review.

This means the Kasi Flavors team will review it again before it appears publicly.

Owner dashboard:
${ownerDashboardUrl}

Regards,
Kasi Flavors Team
`.trim();
}

function buildHtmlEmail({
  ownerName,
  storeName,
  status,
  menuUrl,
  ownerDashboardUrl,
  reason,
}: {
  ownerName?: string | null;
  storeName: string;
  status: StoreApprovalStatus;
  menuUrl: string;
  ownerDashboardUrl: string;
  reason?: string | null;
}) {
  const safeOwnerName = safeHtml(ownerName?.trim() || "there");
  const safeStoreName = safeHtml(storeName);
  const safeReason = safeHtml(reason || "No specific reason was provided.");

  if (status === "APPROVED") {
    return buildStoreStatusEmailHtml({
      badge: "Store approved",
      title: "Your store is now live",
      intro:
        "Customers can now view your digital menu and place collection orders when your store is open.",
      body: `
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
      `,
      actionLabel: "View your live menu",
      actionUrl: menuUrl,
      footerNote:
        "Keep your menu updated and make sure your store is open when you are accepting orders.",
    });
  }

  if (status === "REJECTED") {
    return buildStoreStatusEmailHtml({
      badge: "Changes needed",
      title: "Your store needs changes",
      intro:
        "Your store was reviewed, but it needs a few changes before it can go live on Kasi Flavors.",
      body: `
        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
          Hi <strong>${safeOwnerName}</strong>,
        </p>

        <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
          Your store submission for <strong>${safeStoreName}</strong> needs changes before it can go live.
        </p>

        <div style="margin:24px 0;padding:20px;border-radius:24px;background:#fff4e5;border:1px solid rgba(244,119,5,0.25);">
          <p style="margin:0;color:#f47705;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
            Review note
          </p>

          <p style="margin:10px 0 0;font-size:15px;line-height:1.65;color:#333333;font-weight:600;">
            ${safeReason}
          </p>
        </div>

        <p style="margin:0;font-size:15px;line-height:1.7;color:#444444;">
          Please update your store details, menu, address, or product information where needed, then submit it again for review.
        </p>
      `,
      actionLabel: "Open owner dashboard",
      actionUrl: ownerDashboardUrl,
      footerNote:
        "Your store will not appear publicly until it is approved by the Kasi Flavors team.",
    });
  }

  if (status === "DEACTIVATED") {
    return buildStoreStatusEmailHtml({
      badge: "Store deactivated",
      title: "Your store is currently offline",
      intro:
        "Your store has been temporarily deactivated and is not currently available to customers.",
      body: `
        <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
          Hi <strong>${safeOwnerName}</strong>,
        </p>

        <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
          Your store, <strong>${safeStoreName}</strong>, has been temporarily deactivated on Kasi Flavors.
        </p>

        <div style="margin:24px 0;padding:20px;border-radius:24px;background:#fff1f1;border:1px solid rgba(220,38,38,0.20);">
          <p style="margin:0;color:#dc2626;font-weight:900;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">
            Admin note
          </p>

          <p style="margin:10px 0 0;font-size:15px;line-height:1.65;color:#333333;font-weight:600;">
            ${safeReason}
          </p>
        </div>

        <p style="margin:0;font-size:15px;line-height:1.7;color:#444444;">
          Customers cannot currently place orders from your store. Please review your store details or contact Kasi Flavors support if you believe this was a mistake.
        </p>
      `,
      actionLabel: "Open owner dashboard",
      actionUrl: ownerDashboardUrl,
      footerNote:
        "You can continue preparing your store while it is offline, but customers will not be able to order until it is active again.",
    });
  }

  return buildStoreStatusEmailHtml({
    badge: "Back in review",
    title: "Your store is being reviewed again",
    intro:
      "Your store has been moved back to review and will be checked by the Kasi Flavors team.",
    body: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
        Hi <strong>${safeOwnerName}</strong>,
      </p>

      <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
        Your store, <strong>${safeStoreName}</strong>, has been moved back to review.
      </p>

      <p style="margin:0;font-size:15px;line-height:1.7;color:#444444;">
        This means the Kasi Flavors team will review your store again before it appears publicly.
      </p>
    `,
    actionLabel: "Open owner dashboard",
    actionUrl: ownerDashboardUrl,
    footerNote:
      "We will notify you once the review status changes.",
  });
}

export async function sendStoreStatusEmail({
  to,
  ownerName,
  storeName,
  storeSlug,
  status,
  reason,
}: SendStoreStatusEmailInput) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();

  console.log(`[store-email:${requestId}] Started`, {
    to,
    storeName,
    storeSlug,
    status,
    willGeneratePdf: status === "APPROVED",
  });

  try {
    const appUrl = getAppUrl();
    const menuUrl = `${appUrl}/stores/${storeSlug}`;
    const ownerDashboardUrl = `${appUrl}/owner/store/overview`;

    console.log(`[store-email:${requestId}] URLs built`, {
      appUrl,
      menuUrl,
      ownerDashboardUrl,
    });

    const subject =
      status === "APPROVED"
        ? `${storeName} is now live on Kasi Flavors`
        : status === "REJECTED"
          ? `${storeName} needs changes before going live`
          : status === "DEACTIVATED"
            ? `${storeName} has been deactivated`
            : `${storeName} is back in review`;

    console.log(`[store-email:${requestId}] Subject built`, {
      subject,
    });

    console.log(`[store-email:${requestId}] Building HTML email`);

    const html = buildHtmlEmail({
      ownerName,
      storeName,
      status,
      menuUrl,
      ownerDashboardUrl,
      reason,
    });

    console.log(`[store-email:${requestId}] HTML email built`, {
      htmlLength: html.length,
    });

    console.log(`[store-email:${requestId}] Building text email`);

    const text = buildTextEmail({
      ownerName,
      storeName,
      status,
      menuUrl,
      ownerDashboardUrl,
      reason,
    });

    console.log(`[store-email:${requestId}] Text email built`, {
      textLength: text.length,
    });

    let attachments: {
      filename: string;
      content: Buffer;
      contentType: string;
    }[] = [];

    if (status === "APPROVED") {
      console.log(`[store-email:${requestId}] Starting PDF generation`);

      const pdfStartedAt = Date.now();

      try {
        const pdfAttachment = await generateStoreMenuPosterPdf({
          storeName,
          storeSlug,
          menuUrl,
        });

        attachments = [
          {
            ...pdfAttachment,
            contentType: "application/pdf",
          },
        ];

        console.log(`[store-email:${requestId}] PDF generated successfully`, {
          filename: pdfAttachment.filename,
          sizeBytes: pdfAttachment.content.length,
          durationMs: Date.now() - pdfStartedAt,
        });
      } catch (pdfError) {
        console.error(`[store-email:${requestId}] PDF generation failed`, {
          errorName: pdfError instanceof Error ? pdfError.name : "UnknownError",
          errorMessage:
            pdfError instanceof Error ? pdfError.message : String(pdfError),
          errorStack: pdfError instanceof Error ? pdfError.stack : undefined,
          durationMs: Date.now() - pdfStartedAt,
        });

        // Do not throw unless you want email sending to fail when PDF fails.
        // This allows the approval email to still send without attachment.
        attachments = [];
      }
    } else {
      console.log(`[store-email:${requestId}] Skipping PDF generation`, {
        status,
      });
    }

    console.log(`[store-email:${requestId}] Creating mail transport`);

    const transport = createMailerTransport();

    console.log(`[store-email:${requestId}] Sending email`, {
      to,
      subject,
      attachmentCount: attachments.length,
      attachmentNames: attachments.map((attachment) => attachment.filename),
    });

    const sendStartedAt = Date.now();

    const result = await transport.sendMail({
      from: getFromEmail(),
      to,
      subject,
      html,
      text,
      attachments,
    });

    console.log(`[store-email:${requestId}] Email sent successfully`, {
      durationMs: Date.now() - sendStartedAt,
      totalDurationMs: Date.now() - startedAt,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    });

    return result;
  } catch (error) {
    console.error(`[store-email:${requestId}] Failed`, {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      totalDurationMs: Date.now() - startedAt,
    });

    throw error;
  }
}