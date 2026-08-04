/**
 * Order domain — the single source of truth for order shape and status.
 *
 * Safe to import from both server and client. The persistence layer lives in
 * lib/order-store.ts and must never be imported from a Client Component.
 */

export const DELIVERY_STATUS = {
  pending: {
    label: "Pending",
    description: "Order received, not yet picked",
    chip: "bg-pending-soft text-pending",
    dot: "bg-pending",
  },
  packing: {
    label: "Packing",
    description: "Being picked and packed in store",
    chip: "bg-packing-soft text-packing",
    dot: "bg-packing",
  },
  shipped: {
    label: "Shipped",
    description: "Handed to the courier",
    chip: "bg-shipped-soft text-shipped",
    dot: "bg-shipped",
  },
  delivered: {
    label: "Delivered",
    description: "Confirmed received by customer",
    chip: "bg-delivered-soft text-delivered",
    dot: "bg-delivered",
  },
  cancelled: {
    label: "Cancelled",
    description: "Voided before dispatch",
    chip: "bg-cancelled-soft text-cancelled",
    dot: "bg-cancelled",
  },
} as const;

export type DeliveryStatus = keyof typeof DELIVERY_STATUS;

export const DELIVERY_STATUS_KEYS = Object.keys(
  DELIVERY_STATUS,
) as DeliveryStatus[];

export const PAYMENT_METHOD = {
  paid: "Paid",
  cod: "Cash on delivery",
  refunded: "Refunded",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHOD;

export const PAYMENT_METHOD_KEYS = Object.keys(
  PAYMENT_METHOD,
) as PaymentMethod[];

export const CITIES = [
  "Yangon",
  "Mandalay",
  "Nay Pyi Taw",
  "Mawlamyine",
  "Taunggyi",
  "Pathein",
  "Bago",
  "Monywa",
] as const;

export type Order = {
  id: string;
  /**
   * The saved customer this order came from, when there was one. Optional —
   * a one-off buyer can be typed in without a customer record.
   *
   * The fields below are a *copy* taken at save time, not a live join: if the
   * customer later moves or renames, this order must still show where it was
   * actually delivered. See the Domain section in CLAUDE.md.
   */
  customerId?: string;
  customer: string;
  phone: string;
  city: string;
  address: string;
  items: string;
  itemCount: number;
  /** Kyats, stored as an integer. Never a float. */
  total: number;
  payment: PaymentMethod;
  status: DeliveryStatus;
  notifyBySms: boolean;
  placedAt: string;
};

/** Everything the create form supplies. The rest is assigned by the server. */
export type NewOrder = Omit<Order, "id" | "status" | "placedAt">;

export function formatKyat(amount: number) {
  return `${amount.toLocaleString("en-US")} Ks`;
}
