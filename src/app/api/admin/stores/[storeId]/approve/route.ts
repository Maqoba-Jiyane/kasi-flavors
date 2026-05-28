import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ["ADMIN"]);

    const { storeId } = await params;

    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        approvedById: user.id,
        rejectionReason: null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });

    revalidateTag("stores", "max");
    revalidateTag("stores:open-collection", "max");
    revalidateTag("stores:all-collection", "max");
    revalidateTag(`store:${store.slug}`, "max");
    revalidatePath("/");
    revalidatePath(`/stores/${store.slug}`);

    return NextResponse.json({
      success: true,
      store,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Approve store failed:", error);
    }

    return NextResponse.json(
      { success: false, error: "Failed to approve store." },
      { status: 500 }
    );
  }
}