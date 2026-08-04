/**
 * Order persistence.
 *
 * Server-only — never import this from a Client Component.
 */

import { generateOrderCode } from "@/lib/order-code";
import { prisma } from "@/lib/prisma";
import {
  itemsTotal,
  type DeliveryStatus,
  type OrderWithItems,
  type PaymentMethod,
} from "@/lib/orders";

/** Postgres unique-constraint violation, as surfaced by Prisma. */
function isDuplicateCode(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

/**
 * Order codes end in three random letters, so two orders on the same day can
 * collide (26³ = 17,576 combinations). The unique index is the real guarantee;
 * this just picks fresh letters and tries again.
 */
const CODE_ATTEMPTS = 5;

export type NewOrderLine = {
  /** Null for an ad-hoc line that isn't in the product catalog. */
  productId: number | null;
  /** Snapshot of the product name at time of sale. */
  name: string;
  /** Whole kyats, snapshot at time of sale. */
  unitPrice: number;
  quantity: number;
};

export type NewOrder = {
  customerId: number | null;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  paymentMethod: PaymentMethod;
  notifyBySms: boolean;
  lines: NewOrderLine[];
};

export async function listOrders(): Promise<OrderWithItems[]> {
  return prisma.order.findMany({
    include: { items: true },
    orderBy: { placedAt: "desc" },
  });
}

export async function getOrder(id: number): Promise<OrderWithItems | null> {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
}

/**
 * Creates the order, its lines and its first status event in one transaction —
 * an order with no lines, or lines with no order, would both be corrupt.
 *
 * The total is computed from the lines rather than accepted from the caller, so
 * the stored total can never disagree with what it's made of.
 */
export async function createOrder(input: NewOrder): Promise<OrderWithItems> {
  if (input.lines.length === 0) {
    throw new Error("An order needs at least one line item.");
  }

  const total = itemsTotal(input.lines);

  for (let attempt = 1; attempt <= CODE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.order.create({
        data: {
          code: generateOrderCode(),
          customerId: input.customerId,
          customerName: input.customerName,
          phone: input.phone,
          city: input.city,
          address: input.address,
          total,
          paymentMethod: input.paymentMethod,
          // New orders always start pending; the caller doesn't get to pick.
          status: "pending",
          notifyBySms: input.notifyBySms,
          items: {
            create: input.lines.map((line) => ({
              productId: line.productId,
              name: line.name,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
            })),
          },
          statusEvents: {
            create: [{ status: "pending", changedBy: "system" }],
          },
        },
        include: { items: true },
      });
    } catch (error) {
      if (isDuplicateCode(error) && attempt < CODE_ATTEMPTS) continue;
      throw error;
    }
  }

  // Unreachable: the loop either returns or throws.
  throw new Error(
    `Could not generate a unique order code after ${CODE_ATTEMPTS} attempts.`,
  );
}

/** Records the change and appends to the order's history in one transaction. */
export async function updateOrderStatus(
  id: number,
  status: DeliveryStatus,
  changedBy = "",
  note = "",
): Promise<OrderWithItems> {
  return prisma.order.update({
    where: { id },
    data: {
      status,
      statusEvents: { create: [{ status, changedBy, note }] },
    },
    include: { items: true },
  });
}
