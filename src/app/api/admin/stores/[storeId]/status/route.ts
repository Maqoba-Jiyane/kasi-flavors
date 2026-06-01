//src/app/api/admin/stores/[storeId]/status

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, assertRole } from "@/lib/auth";
import { revalidatePath, revalidateTag } from "next/cache";
import type { StoreApprovalStatus } from "@prisma/client";
import { sendStoreStatusEmail } from "@/lib/email/send-store-status-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: StoreApprovalStatus[] = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "DEACTIVATED",
];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const user = await getCurrentUser();
    assertRole(user, ["ADMIN"]);

    const { storeId } = await params;
    const body = await req.json();

    const status = String(body?.status || "") as StoreApprovalStatus;
    const reason = String(body?.reason || "").trim();

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid store status." },
        { status: 400 },
      );
    }

    if (status === "REJECTED" && !reason) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required." },
        { status: 400 },
      );
    }

    const store = await prisma.store.update({
      where: { id: storeId },
      data: {
        approvalStatus: status,
        approvedAt: status === "APPROVED" ? new Date() : null,
        approvedById: status === "APPROVED" ? user.id : null,
        rejectionReason:
          status === "REJECTED" || status === "DEACTIVATED"
            ? reason || null
            : null,
        isOpen: status === "APPROVED" ? undefined : false,
      },
      select: {
        id: true,
        slug: true,name: true,
        approvalStatus: true,owner: {
          select: {email: true, name: true}
        }
      },
    });

if (store.owner?.email) {
  try {
    await sendStoreStatusEmail({
      to: store.owner.email,
      ownerName: store.owner.name,
      storeName: store.name,
      storeSlug: store.slug,
      status: store.approvalStatus,
      reason,
    });
  } catch (emailError) {
    if (process.env.NODE_ENV === "development") {
      console.error("Store status email failed:", emailError);
    }
  }
}

    revalidateTag("stores", "max");
    revalidateTag("stores:open-collection", "max");
    revalidateTag("stores:all-collection", "max");
    revalidateTag(`store:${store.slug}`, "max");
    revalidateTag(`store-menu:${store.slug}`, "max");

    revalidatePath("/");
    revalidatePath("/admin/stores");
    revalidatePath(`/admin/stores/${store.id}`);
    revalidatePath(`/stores/${store.slug}`);
    revalidatePath("/owner/store/overview");

    return NextResponse.json({
      success: true,
      store,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Admin store status update failed:", error);
    }

    return NextResponse.json(
      { success: false, error: "Failed to update store status." },
      { status: 500 },
    );
  }
}
