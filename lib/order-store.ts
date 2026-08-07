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
 * Total units leaving the shelf per product.
 *
 * Summed rather than applied line by line: the same product can appear twice on
 * one order, and flooring each line at zero separately would let the second
 * line's units escape the count.
 */
function stockMovements(lines: NewOrderLine[]): Map<number, number> {
  const moves = new Map<number, number>();
  for (const line of lines) {
    // Ad-hoc lines carry no productId and move nothing.
    if (line.productId === null) continue;
    moves.set(line.productId, (moves.get(line.productId) ?? 0) + line.quantity);
  }
  return moves;
}

/**
 * Creates the order, its lines and its first status event in one transaction —
 * an order with no lines, or lines with no order, would both be corrupt.
 *
 * The total is computed from the lines rather than accepted from the caller, so
 * the stored total can never disagree with what it's made of.
 *
 * Placing the order also takes its units off the shelf, in the same
 * transaction: stock that dropped only after a separate later call would be
 * wrong for exactly as long as that call took to arrive, and not at all if it
 * failed.
 */
export async function createOrder(input: NewOrder): Promise<OrderWithItems> {
  if (input.lines.length === 0) {
    throw new Error("An order needs at least one line item.");
  }

  const total = itemsTotal(input.lines);
  const moves = stockMovements(input.lines);

  for (let attempt = 1; attempt <= CODE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
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

        for (const [productId, quantity] of moves) {
          // Raw UPDATE rather than read-then-write: the new value is computed
          // by Postgres from the row it is locking, so two staff saving at the
          // same moment can't both subtract from the same starting number.
          //
          // GREATEST floors the result at zero. Selling more than the counted
          // stock is allowed — the form warns but doesn't block, because the
          // count is maintained by hand and staff know what is actually on the
          // shelf. A negative shelf count would be a worse lie than zero, and
          // the check constraint forbids it either way.
          //
          // updated_at is set by hand because @updatedAt only fires on writes
          // that go through Prisma's query builder.
          await tx.$executeRaw`
            UPDATE "products"
            SET "stock" = GREATEST("stock" - ${quantity}, 0),
                "updated_at" = now()
            WHERE "id" = ${productId}
          `;
        }

        return order;
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
