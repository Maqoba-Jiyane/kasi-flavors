import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ["ADMIN"]);

    const { storeId } = await params;
    const body = await req.json();

    const rejectionReason = String(body?.reason || "").trim();

    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        approvalStatus: "REJECTED",
        approvedAt: null,
        approvedById: null,
        rejectionReason: rejectionReason || "Store needs changes before approval.",
        isOpen: false,
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
      console.error("Reject store failed:", error);
    }

    return NextResponse.json(
      { success: false, error: "Failed to reject store." },
      { status: 500 }
    );
  }
}