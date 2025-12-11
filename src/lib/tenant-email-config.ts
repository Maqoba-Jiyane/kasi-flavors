// src/lib/tenant-email-config.ts

import { TenantEmailConfig } from "@/lib/email/types";

/**
 * In future, replace this with a real DB lookup by tenantId.
 * For now, we provide a safe default, and still enforce that
 * tenantId is always passed through the stack.
 */
export async function getTenantEmailConfig(
  tenantId: string,
): Promise<TenantEmailConfig> {
  const brandName = process.env.DEFAULT_BRAND_NAME ?? "Kasi Flavors";

  const from =
    process.env.EMAIL_FROM ??
    "kasiflavors@gmail.com"; // or some safe default domain

  const baseUrl =
    process.env.APP_BASE_URL ?? "http://localhost:3000";

  return {
    tenantId,
    from,
    brandName,
    baseUrl,
    poweredBy: `Powered by ${brandName}`,
    // You can extend later with per-tenant logo, replyTo, etc.
    replyTo: process.env.EMAIL_REPLY_TO ?? undefined,
    logoUrl: process.env.BRAND_LOGO_URL ?? undefined,
  };
}
