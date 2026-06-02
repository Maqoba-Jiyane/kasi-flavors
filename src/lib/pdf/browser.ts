// src/lib/pdf/browser.ts
import chromium from "@sparticuz/chromium";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function launchPdfBrowser() {
  const { chromium: playwrightChromium } = await import("playwright-core");

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

  if (executablePath) {
    return playwrightChromium.launch({
      executablePath,
      headless: true,
    });
  }

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
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