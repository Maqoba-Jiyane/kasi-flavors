type StoreStatusEmailTemplateInput = {
  title: string;
  badge: string;
  intro: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function safeHtml(value: string | null | undefined) {
  return escapeHtml(String(value || ""));
}

export function buildStoreStatusEmailHtml({
  title,
  badge,
  intro,
  body,
  actionLabel,
  actionUrl,
  footerNote,
}: StoreStatusEmailTemplateInput) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const logoUrl = `${appUrl}/brand/kasi-flavors-logo.png`;

  return `
  <div style="margin:0;padding:0;background:#f6efdf;font-family:Arial,Helvetica,sans-serif;color:#111111;">
    <div style="max-width:680px;margin:0 auto;padding:28px 18px;">
      <div style="background:#fffdf8;border:1px solid rgba(17,17,17,0.10);border-radius:30px;overflow:hidden;">
        <div style="height:8px;background:linear-gradient(90deg,#006b2b 0%,#f47705 52%,#f9bd0b 100%);"></div>

        <div style="padding:30px 28px 24px;background:#111111;text-align:center;">
          <img
            src="${logoUrl}"
            alt="Kasi Flavors"
            style="display:block;max-width:160px;width:100%;height:auto;margin:0 auto 20px;background:#ffffff;border-radius:18px;padding:10px;"
          />

          <div style="display:inline-block;background:#f9bd0b;color:#111111;font-size:11px;font-weight:900;letter-spacing:0.12em;text-transform:uppercase;padding:8px 14px;border-radius:999px;">
            ${safeHtml(badge)}
          </div>

          <h1 style="margin:18px 0 0;color:#ffffff;font-size:32px;line-height:1.08;font-weight:900;">
            ${safeHtml(title)}
          </h1>

          <p style="margin:12px auto 0;max-width:480px;color:rgba(255,255,255,0.72);font-size:15px;line-height:1.65;font-weight:600;">
            ${safeHtml(intro)}
          </p>
        </div>

        <div style="padding:30px 28px;background:#fffdf8;">
          <div style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#222;">
            ${body}
          </div>

          ${
            actionLabel && actionUrl
              ? `
              <div style="text-align:center;margin:28px 0;">
                <a
                  href="${safeHtml(actionUrl)}"
                  target="_blank"
                  style="display:inline-block;background:#006b2b;color:#ffffff;text-decoration:none;font-weight:900;border-radius:999px;padding:15px 24px;font-size:15px;"
                >
                  ${safeHtml(actionLabel)}
                </a>
              </div>
            `
              : ""
          }

          ${
            actionUrl
              ? `
              <div style="border-top:1px solid rgba(17,17,17,0.08);padding-top:20px;margin-top:24px;">
                <p style="margin:0 0 8px;font-size:13px;color:#555;font-weight:900;text-transform:uppercase;letter-spacing:0.06em;">
                  Link
                </p>

                <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;">
                  <a href="${safeHtml(actionUrl)}" target="_blank" style="color:#006b2b;font-weight:800;">
                    ${safeHtml(actionUrl)}
                  </a>
                </p>
              </div>
            `
              : ""
          }

          ${
            footerNote
              ? `
              <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#444444;">
                ${safeHtml(footerNote)}
              </p>
            `
              : ""
          }

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
}