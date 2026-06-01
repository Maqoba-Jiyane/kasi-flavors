// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },  serverExternalPackages: [
    "playwright-core",
    "@sparticuz/chromium",
  ],
};

export default nextConfig;