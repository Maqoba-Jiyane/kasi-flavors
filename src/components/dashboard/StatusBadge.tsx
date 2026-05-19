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
  PENDING: "bg-golden-yellow text-kasi-black border-golden-yellow",
  ACCEPTED: "bg-kasi-green/10 text-kasi-green border-kasi-green/20",
  IN_PREPARATION: "bg-street-orange/10 text-street-orange border-street-orange/20",
  READY_FOR_COLLECTION: "bg-kasi-green text-white border-kasi-green",
  OUT_FOR_DELIVERY: "bg-kasi-black text-white border-kasi-black",
  COMPLETED: "bg-black/10 text-black/60 border-black/10",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

const statusDotStyles: Record<OrderStatus, string> = {
  PENDING: "bg-kasi-black",
  ACCEPTED: "bg-kasi-green",
  IN_PREPARATION: "bg-street-orange",
  READY_FOR_COLLECTION: "bg-white",
  OUT_FOR_DELIVERY: "bg-golden-yellow",
  COMPLETED: "bg-black/50",
  CANCELLED: "bg-red-600",
};

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  IN_PREPARATION: "In preparation",
  READY_FOR_COLLECTION: "Ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wide ${statusStyles[status]}`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${statusDotStyles[status]}`}
      />
      {statusLabels[status]}
    </span>
  );
}