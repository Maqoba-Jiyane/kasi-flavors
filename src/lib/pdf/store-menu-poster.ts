import QRCode from "qrcode";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

type StoreMenuPosterInput = {
  storeName: string;
  storeSlug: string;
  menuUrl: string;
};

function sanitizeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "kasi-flavors-store"
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function launchPdfBrowser() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

  if (executablePath) {
    return playwrightChromium.launch({
      executablePath,
      headless: true,
    });
  }

  if (process.env.NODE_ENV !== "development") {
    return playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  return playwrightChromium.launch({
    headless: true,
  });
}

export async function generateStoreMenuPosterPdf({
  storeName,
  storeSlug,
  menuUrl,
}: StoreMenuPosterInput) {
  const qrDataUrl = await QRCode.toDataURL(menuUrl, {
    margin: 1,
    width: 900,
    errorCorrectionLevel: "H",
    color: {
      dark: "#050505",
      light: "#FFFFFF",
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const logoUrl = `${appUrl}/brand/kasi-flavors-logo.png`;

  const safeStoreName = escapeHtml(storeName);
  const safeMenuUrl = escapeHtml(menuUrl);

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      width: 210mm;
      height: 297mm;
      background: #f6efdf;
      font-family: Arial, Helvetica, sans-serif;
      color: #111111;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 210mm;
      height: 297mm;
      padding: 10mm;
      background:
        radial-gradient(circle at top left, rgba(249,189,11,0.10), transparent 26%),
        radial-gradient(circle at bottom right, rgba(0,107,43,0.10), transparent 26%),
        #f6efdf;
    }

    .poster {
      position: relative;
      width: 100%;
      height: 100%;
      background: #fffdf8;
      border: 1.8mm solid #111111;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .top-accent {
      height: 6mm;
      background: linear-gradient(90deg, #006b2b 0%, #f47705 52%, #f9bd0b 100%);
    }

    .inner {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 12mm 13mm 10mm;
    }

    .logo-wrap {
      width: 48mm;
      height: 20mm;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    .logo-wrap img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
    }

    .brand-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8mm;
    }

    .brand-left {
      display: flex;
      align-items: center;
      gap: 6mm;
    }

    .brand-badges {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 2.5mm;
      flex-wrap: wrap;
      max-width: 92mm;
    }

    .brand-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      padding: 2.2mm 4.2mm;
      border: 0.5mm solid rgba(17,17,17,0.12);
      border-radius: 999px;
      font-size: 8.5pt;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #666666;
      background: #ffffff;
    }

    .brand-tag.dark {
      background: #111111;
      color: #f9bd0b;
      border-color: #111111;
    }

    .hero {
      margin-top: 12mm;
      text-align: center;
    }

    .eyebrow {
      font-size: 11pt;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #006b2b;
      margin-bottom: 4mm;
    }

    .hero h1 {
      margin: 0;
      font-size: 34pt;
      line-height: 0.95;
      font-weight: 900;
      letter-spacing: 0.01em;
      color: #111111;
    }

    .hero h1 .accent {
      display: block;
      color: #f47705;
      margin-top: 2mm;
    }

    .store-name {
      margin-top: 7mm;
      font-size: 21pt;
      line-height: 1.15;
      font-weight: 900;
      color: #111111;
    }

    .subtext {
      max-width: 125mm;
      margin: 4mm auto 0;
      font-size: 11.5pt;
      line-height: 1.55;
      color: #4b4b4b;
      font-weight: 600;
    }

    .qr-section {
      margin-top: 10mm;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .qr-card {
      width: 112mm;
      background: #ffffff;
      border: 0.8mm solid rgba(17,17,17,0.10);
      border-radius: 7mm;
      padding: 7mm;
      box-shadow:
        0 2mm 6mm rgba(0,0,0,0.06),
        inset 0 0 0 0.35mm rgba(249,189,11,0.45);
    }

    .qr-inner {
      border: 0.8mm solid #111111;
      border-radius: 4mm;
      padding: 5mm;
      background: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .qr-inner img {
      width: 86mm;
      height: 86mm;
      display: block;
    }

    .scan-note {
      margin-top: 5mm;
      text-align: center;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #444444;
      font-weight: 700;
    }

    .steps {
      margin-top: 8mm;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4mm;
    }

    .step {
      background: #faf6ec;
      border: 0.45mm solid rgba(17,17,17,0.08);
      border-radius: 5mm;
      padding: 5mm 4mm;
      text-align: center;
    }

    .step-number {
      width: 8mm;
      height: 8mm;
      margin: 0 auto 2.5mm;
      border-radius: 999px;
      background: #111111;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      font-weight: 900;
    }

    .step strong {
      display: block;
      font-size: 10pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #006b2b;
      margin-bottom: 1.5mm;
    }

    .step span {
      display: block;
      font-size: 9pt;
      font-weight: 700;
      line-height: 1.45;
      color: #444444;
    }

    .bottom {
      margin-top: auto;
      padding-top: 8mm;
    }

    .bottom-band {
      border-top: 0.5mm solid rgba(17,17,17,0.10);
      padding-top: 5mm;
      text-align: center;
    }

    .bottom-band .primary {
      font-size: 13pt;
      font-weight: 900;
      color: #111111;
    }

    .bottom-band .secondary {
      margin-top: 1.8mm;
      font-size: 9.2pt;
      line-height: 1.5;
      color: #666666;
      font-weight: 700;
      word-break: break-all;
    }
  </style>
</head>

<body>
  <div class="page">
    <main class="poster">
      <div class="top-accent"></div>

      <div class="inner">
        <div class="brand-row">
          <div class="brand-left">
            <div class="logo-wrap">
              <img src="${logoUrl}" alt="Kasi Flavors" />
            </div>
          </div>

          <div class="brand-badges">
            <div class="brand-tag">Skip the queue</div>
            <div class="brand-tag dark">Collection first</div>
          </div>
        </div>

        <section class="hero">
          <div class="eyebrow">Digital menu access</div>

          <h1>
            SCAN TO OPEN
            <span class="accent">OUR MENU</span>
          </h1>

          <div class="store-name">${safeStoreName}</div>

          <div class="subtext">
            Scan the QR code below to view our digital menu, place your order online,
            and collect when your food is ready.
          </div>
        </section>

        <section class="qr-section">
          <div class="qr-card">
            <div class="qr-inner">
              <img src="${qrDataUrl}" alt="QR code for ${safeStoreName} menu" />
            </div>

            <div class="scan-note">
              Open your phone camera and scan the QR code
            </div>
          </div>
        </section>

        <section class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <strong>Scan</strong>
            <span>Open the digital menu on your phone</span>
          </div>

          <div class="step">
            <div class="step-number">2</div>
            <strong>Order</strong>
            <span>Choose your meal and place your order online</span>
          </div>

          <div class="step">
            <div class="step-number">3</div>
            <strong>Collect</strong>
            <span>Pick up your food when it is ready</span>
          </div>
        </section>

        <div class="bottom">
          <div class="bottom-band">
            <div class="primary">Powered by Kasi Flavors</div>
            <div class="secondary">${safeMenuUrl}</div>
          </div>
        </div>
      </div>
    </main>
  </div>
</body>
</html>
`;

  const browser = await launchPdfBrowser();

  try {
    const page = await browser.newPage({
      viewport: {
        width: 794,
        height: 1123,
      },
      deviceScaleFactor: 2,
    });

    await page.setContent(html, {
      waitUntil: "networkidle",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    return {
      filename: `${sanitizeFileName(storeName || storeSlug)}-menu-qr-poster.pdf`,
      content: Buffer.from(pdfBuffer),
    };
  } finally {
    await browser.close();
  }
}
