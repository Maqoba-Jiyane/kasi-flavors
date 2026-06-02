// src/app/api/debug/pdf/route.ts

import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const { chromium: playwrightChromium } = await import("playwright-core");

    const executablePath = await chromium.executablePath();

    const browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(
      `
      <html>
        <body>
          <h1>Kasi Flavors PDF Test</h1>
          <p>If this downloads, Playwright PDF generation works on Vercel.</p>
        </body>
      </html>
      `,
      { waitUntil: "load" },
    );

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="pdf-test.pdf"',
      },
    });
  } catch (error) {
    console.error("PDF debug failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}