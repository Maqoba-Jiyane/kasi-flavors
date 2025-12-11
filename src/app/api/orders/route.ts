// app/api/orders/route.ts
import { enqueueOrderConfirmationEmail } from "@/lib/queues/emailQueue";

export async function POST(req: Request) {
  const { tenantId, order, user } = await req.json();

  // ...place order, persist, etc.

  await enqueueOrderConfirmationEmail({
    tenantId,
    // to: user.email,
    // customerName: user.name,
    // storeName: order.storeName,
    orderId: order.id,
    // pickupCode: order.pickupCode,
    userId: user.id
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
