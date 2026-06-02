// src/app/api/debug/playwright/route.ts

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {};

  try {
    const mod = await import("playwright-core");

    result.playwrightImported = true;
    result.hasChromium = Boolean(mod.chromium);
  } catch (error) {
    result.playwrightImported = false;
    result.error = error instanceof Error ? error.message : String(error);
    result.stack = error instanceof Error ? error.stack : undefined;
  }

  try {
    const chromium = await import("@sparticuz/chromium");

    result.sparticuzImported = true;
    result.hasExecutablePath = typeof chromium.default.executablePath === "function";
  } catch (error) {
    result.sparticuzImported = false;
    result.sparticuzError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(result);
}