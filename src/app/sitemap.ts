import { prisma } from "@/lib/prisma";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.kasiflavors.co.za";

  const stores = await prisma.store.findMany({
    where: { isOpen: true },
    select: { slug: true, updatedAt: true },
  });

  const storeUrls: MetadataRoute.Sitemap = stores.map((store) => ({
    url: `${baseUrl}/store/${store.slug}`,
    lastModified: store.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1,
    },
    ...storeUrls,
  ];
}
