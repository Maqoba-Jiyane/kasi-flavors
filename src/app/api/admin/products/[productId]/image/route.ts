import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const admin = await getCurrentUser();
    assertRole(admin, ["ADMIN"]);

    const { productId } = await params;
    const body = await req.json();

    const imageUrl = String(body?.imageUrl || "").trim();

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        imageUrl: imageUrl || null,
      },
      select: {
        id: true,
        storeId: true,
        imageUrl: true,
        store: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });

    revalidateTag(`store-menu:${product.store.slug}`, "max");
    revalidatePath(`/stores/${product.store.slug}`);
    revalidatePath(`/admin/stores/${product.storeId}`);
    revalidatePath(`/admin/stores/${product.storeId}/products`);

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Admin product image update failed:", error);

    return NextResponse.json(
      { success: false, error: "Failed to update product image." },
      { status: 500 },
    );
  }
}