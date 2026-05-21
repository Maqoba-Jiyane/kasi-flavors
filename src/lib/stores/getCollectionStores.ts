// src/lib/stores/getCollectionStores.ts
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const getOpenCollectionStores = unstable_cache(
  async () => {
    return prisma.store.findMany({
      where: {
        supportsCollection: true,
        isOpen: true,
        approvalStatus: "APPROVED",
        lat: { not: null },
        lng: { not: null },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
  ["stores:open-collection"],
  {
    revalidate: 60*60, // 1 hour
    tags: ["stores", "stores:open-collection"],
  }
);

export const getAllCollectionStores = unstable_cache(
  async () => {
    return prisma.store.findMany({
      where: {
        supportsCollection: true,
        approvalStatus: "APPROVED",
        lat: { not: null },
        lng: { not: null },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
  ["stores:all-collection"],
  {
    revalidate: 60*60, // 1 hour
    tags: ["stores", "stores:all-collection"],
  }
);