// src/lib/stores/getAvailableStoreCount.ts
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

const EXCLUDED_STORE_IDS = [
  "6a1d8fba83d8b1f561dd349c",
];

export const getAvailableStoreCountCached = unstable_cache(
  async () => {
    return prisma.store.count({
      where: {
        approvalStatus: "APPROVED",
        id: {
          notIn: EXCLUDED_STORE_IDS,
        },
      },
    });
  },
  ["kasi-flavors:available-store-count"],
  {
    revalidate: ONE_WEEK_SECONDS,
    tags: ["stores:available-count"],
  },
);