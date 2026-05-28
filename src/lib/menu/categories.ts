import { prisma } from "@/lib/prisma";

export function slugifyCategory(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "menu";
}

export function normalizeCategoryName(value: unknown) {
  const name = String(value || "").trim();
  return name || "Menu";
}

export async function getOrCreateMenuCategory({
  storeId,
  categoryName,
}: {
  storeId: string;
  categoryName: string;
}) {
  const name = normalizeCategoryName(categoryName);

  const existing = await prisma.menuCategory.findFirst({
    where: {
      storeId,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sortOrder: true,
    },
  });

  if (existing) return existing;

  const lastCategory = await prisma.menuCategory.findFirst({
    where: { storeId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return prisma.menuCategory.create({
    data: {
      storeId,
      name,
      slug: slugifyCategory(name),
      sortOrder: (lastCategory?.sortOrder ?? -1) + 1,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      sortOrder: true,
    },
  });
}