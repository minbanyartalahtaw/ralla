/**
 * Order domain — presentation metadata for the values the database defines.
 *
 * The status and payment types come from the Prisma schema, so the UI can't
 * drift from what the database will actually accept. This file only adds the
 * things a schema can't hold: labels, descriptions and colors.
 *
 * Safe to import from both server and client.
 */

import { DeliveryStatus, PaymentMethod } from "@/generated/prisma/enums";
import type {
  OrderModel,
  OrderItemModel,
  OrderStatusEventModel,
} from "@/generated/prisma/models";

export { DeliveryStatus, PaymentMethod };

/** Row shapes Prisma returns. Aliased so app code reads naturally. */
export type Order = OrderModel;
export type OrderItem = OrderItemModel;
export type OrderStatusEvent = OrderStatusEventModel;

/** An order with its lines, which is how the UI always wants it. */
export type OrderWithItems = Order & { items: OrderItem[] };

/** Everything one order's page shows — the lines plus how it got here. */
export type OrderDetail = OrderWithItems & {
  statusEvents: OrderStatusEvent[];
};

/**
 * Dashboard aggregates. Declared here rather than in the store because the
 * chart components are Client Components, and `*-store.ts` is server-only.
 */
export type RevenueDay = {
  /** `YYYY-MM-DD`, the Yangon calendar day. */
  day: string;
  revenue: number;
  orders: number;
};

/** One bar on a dashboard breakdown — a named category and its magnitude. */
export type LabelledCount = {
  /** Printed on the axis. Keep it short — the axis gutter is ~110px. */
  label: string;
  value: number;
  /** Longer name, revealed when the bar is clicked. Omit if there's no more. */
  detail?: string;
};

type StatusMeta = {
  label: string;
  description: string;
  /** Tailwind classes for the status chip. */
  chip: string;
  /** Tailwind class for the status dot. */
  dot: string;
};

export const DELIVERY_STATUS: Record<DeliveryStatus, StatusMeta> = {
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
};

export const DELIVERY_STATUS_KEYS = Object.keys(
  DELIVERY_STATUS,
) as DeliveryStatus[];

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  paid: "Paid",
  cod: "Cash on delivery",
  refunded: "Refunded",
};

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

export function formatKyat(amount: number) {
  return `${amount.toLocaleString("en-US")} Ks`;
}

/**
 * Myanmar is UTC+06:30. Formatting must name the zone explicitly — slicing an
 * ISO string gives the UTC date, which is wrong for anything placed before
 * 06:30 local.
 */
export const TIME_ZONE = "Asia/Yangon";

/**
 * ISO-style `2026-08-04`, in Yangon time.
 *
 * `en-CA` is the locale that natively formats as YYYY-MM-DD, so this stays a
 * real localized format rather than hand-built string slicing — which is what
 * would reintroduce the UTC bug.
 */
export function formatDate(value: Date) {
  return value.toLocaleDateString("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** `2026-08-04 17:20`, in Yangon time. 24-hour, to match the date's shape. */
export function formatDateTime(value: Date) {
  return value
    .toLocaleString("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    // en-CA joins date and time with a comma; a space reads better in a table.
    .replace(", ", " ");
}

/** Line totals must reconcile with the order total — this is the one formula. */
export function lineTotal(item: { unitPrice: number; quantity: number }) {
  return item.unitPrice * item.quantity;
}

export function itemsTotal(items: { unitPrice: number; quantity: number }[]) {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function itemCount(items: { quantity: number }[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
