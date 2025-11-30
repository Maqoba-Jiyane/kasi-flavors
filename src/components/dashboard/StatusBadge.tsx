type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "IN_PREPARATION"
  | "READY_FOR_COLLECTION"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusStyles: Record<OrderStatus, string> = {
  PENDING:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  ACCEPTED:
    "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60",
  IN_PREPARATION:
    "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-900/60",
  READY_FOR_COLLECTION:
    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  OUT_FOR_DELIVERY:
    "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-900/60",
  COMPLETED:
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  CANCELLED:
    "bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusStyles[status]}`}
    >
      {label}
    </span>
  );
}
