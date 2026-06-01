// src/lib/pdf/browser.ts
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

export async function launchPdfBrowser() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
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