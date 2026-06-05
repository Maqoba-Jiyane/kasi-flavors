// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.unsplash.com",
      },
    ],
  },

  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],

  outputFileTracingIncludes: {
    "/api/admin/stores/[storeId]/status": [
      "./node_modules/playwright-core/browsers.json",
      "./node_modules/playwright-core/lib/**",
      "./node_modules/@sparticuz/chromium/**",
    ],

    "/api/debug/pdf": [
      "./node_modules/playwright-core/browsers.json",
      "./node_modules/playwright-core/lib/**",
      "./node_modules/@sparticuz/chromium/**",
    ],
  },
};

export default nextConfig;