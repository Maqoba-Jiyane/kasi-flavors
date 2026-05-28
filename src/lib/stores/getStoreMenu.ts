import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export function getStoreMenuCached(slug: string) {
  return unstable_cache(
    async () => {
      return prisma.store.findUnique({
        where: { slug },
        include: {
          products: {
            where: { isAvailable: true },
            include: {
              category: true,
            },
            orderBy: [
              { category: { sortOrder: "asc" } },
              { createdAt: "asc" },
            ],
          },
        },
      });
    },
    ["store-menu", slug],
    {
      revalidate: 60*60,
      tags: ["stores", `store:${slug}`, `store-menu:${slug}`],
    }
  )();
}