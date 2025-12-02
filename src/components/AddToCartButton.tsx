// app/(public)/stores/[slug]/AddToCartButton.tsx
"use client";

import { useFormStatus } from "react-dom";
import { addToCart } from "@/app/cart/actions";

interface AddToCartButtonProps {
  productId: string;
}

function AddButtonInner() {
  const status = useFormStatus();
  return (
    <button
      type="submit"
      disabled={status.pending}
      className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
    >
      {status.pending ? "Adding..." : "Add to cart"}
    </button>
  );
}

// export function AddToCartButton({ productId }: AddToCartButtonProps) {
//   return (
//     <form action={addToCart} className="mt-2">
//       <input type="hidden" name="productId" value={productId} />
//       <input type="hidden" name="quantity" value="1" />
//       <AddButtonInner />
//     </form>
//   );
// }
