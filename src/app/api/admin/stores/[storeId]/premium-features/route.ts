import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";

function parseBoolean(value: unknown) {
  return value === true;
}

function parseOptionalDate(value: unknown) {
  if (!value) return null;

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const admin = await getCurrentUser();
    assertRole(admin, ["ADMIN"]);

    const { storeId } = await params;
    const body = await req.json();

    const premiumEnabled = parseBoolean(body?.premiumEnabled);

    const premiumUntil = parseOptionalDate(body?.premiumUntil);

    const description = String(body?.description || "").trim();
    const ogImageUrl = String(body?.ogImageUrl || "").trim();

    const store = await prisma.store.update({
      where: {
        id: storeId,
      },
      data: {
        description: description || null,
        ogImageUrl: ogImageUrl || null,

        premiumEnabled,
        premiumUntil,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        ogImageUrl: true,
        premiumEnabled: true,
        premiumUntil: true,
      },
    });

    revalidateTag("stores", "max");
    revalidateTag(`store:${store.slug}`, "max");
    revalidateTag(`store-menu:${store.slug}`, "max");

    revalidatePath("/admin/stores");
    revalidatePath(`/admin/stores/${store.id}`);
    revalidatePath(`/stores/${store.slug}`);

    return NextResponse.json({
      success: true,
      store,
    });
  } catch (error) {
    console.error("Admin premium feature update failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update premium features.",
      },
      { status: 500 },
    );
  }
}