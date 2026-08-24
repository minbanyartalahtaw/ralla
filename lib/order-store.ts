/**
 * Order persistence.
 *
 * Server-only — never import this from a Client Component.
 */

import { generateOrderCode } from "@/lib/order-code";
import { prisma } from "@/lib/prisma";
import {
  DELIVERY_STATUS_KEYS,
  formatDate,
  itemsTotal,
  type DeliveryStatus,
  type OrderDetail,
  type OrderWithItems,
  type LabelledCount,
  type PaymentMethod,
  type RevenueDay,
} from "@/lib/orders";

/**
 * A line asked for more units than the shelf has. Thrown from inside the write
 * transaction, so the order is rolled back rather than half-saved; the caller
 * turns it into a form error.
 */
export class OutOfStockError extends Error {
  constructor(
    readonly productName: string,
    readonly stock: number,
    readonly wanted: number,
  ) {
    super(
      stock === 0
        ? `${productName} is out of stock.`
        : `Only ${stock} of ${productName} in stock, ordering ${wanted}.`,
    );
    this.name = "OutOfStockError";
  }
}

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
  note: string;
  lines: NewOrderLine[];
};

/**
 * Reduces a typed order code to something worth matching on.
 *
 * Spaces come off anywhere, not just the ends: a code copied out of a chat
 * message or a spreadsheet cell arrives as `RL-260804 TXI` often enough that
 * an exact match would find nothing on a query that is otherwise correct.
 *
 * A leading `RL-` comes off too. The search box shows it as a fixed prefix so
 * nobody has to type it — but a whole code pasted in is the commonest thing to
 * land in that box, and without this it would go looking for `RL-RL-260804TXI`.
 * The dash is optional because the prefix gets pasted both ways.
 */
export function normalizeOrderQuery(query: string | undefined): string {
  return (query ?? "").replace(/\s+/g, "").replace(/^rl-?/i, "");
}

/** What the orders list is narrowed by. Both are optional and combine. */
export type OrderFilter = {
  /** Matched against the order code. See normalizeOrderQuery(). */
  query?: string;
  /** One delivery status, or undefined for all of them. */
  status?: DeliveryStatus;
};

/**
 * Turns a filter into a Prisma `where`, so the list and its counts can never
 * disagree about what is being looked at.
 */
function orderWhere({ query, status }: OrderFilter) {
  const code = normalizeOrderQuery(query);

  return {
    ...(code === "" ? {} : { code: { contains: code, mode: "insensitive" as const } }),
    ...(status ? { status } : {}),
  };
}

/**
 * Orders, newest first, narrowed by code and/or delivery status.
 *
 * Code search only, deliberately: `RL-260804TXI` is what staff have in front of
 * them when someone asks after an order, and matching names or phones here
 * would make a search for a code quietly return rows that aren't it.
 *
 * `contains` rather than an exact match, so the tail of a code is enough —
 * codes are matched case-insensitively for the same reason the detail routes
 * are: they're stored uppercase but get typed and pasted in every case.
 *
 * `id` breaks ties on `placedAt`. Two orders saved in the same millisecond have
 * no order between them otherwise, so the list could shuffle them between two
 * renders of the same data — and would put one on both sides of a page
 * boundary the day this list is paginated.
 */
export async function listOrders(
  filter: OrderFilter = {},
): Promise<OrderWithItems[]> {
  return prisma.order.findMany({
    where: orderWhere(filter),
    include: { items: true },
    orderBy: [{ placedAt: "desc" }, { id: "desc" }],
  });
}

/** Rows per page on the orders list. */
export const ORDERS_PER_PAGE = 9;

export type OrderPage = {
  orders: OrderWithItems[];
  /** Every order matching the filter, not just this page. */
  total: number;
  /** The page actually returned — the request is clamped, see below. */
  page: number;
  pageCount: number;
};

/**
 * One page of orders, newest first.
 *
 * The count runs first because the requested page has to be clamped against it:
 * `?page=999` on a three-page list should land on page 3, not render an empty
 * table that looks like the filter is broken. `pageCount` is at least 1 so an
 * empty list still reports "page 1 of 1" rather than "1 of 0".
 *
 * Both queries share `orderWhere()`, so the total can never describe a
 * different set of orders than the rows do.
 */
export async function listOrdersPage(
  filter: OrderFilter = {},
  requestedPage = 1,
): Promise<OrderPage> {
  const where = orderWhere(filter);

  const total = await prisma.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
  const page = Math.min(Math.max(1, requestedPage), pageCount);

  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    // The `id` tiebreaker is load-bearing here: without it two orders sharing a
    // `placedAt` have no defined order, so one could appear on both page 1 and
    // page 2 while another is skipped entirely.
    orderBy: [{ placedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * ORDERS_PER_PAGE,
    take: ORDERS_PER_PAGE,
  });

  return { orders, total, page, pageCount };
}

/**
 * How many orders sit in each delivery status, under the same filter.
 *
 * Counted in the database rather than by loading the orders and tallying them:
 * the point of these numbers is to say how much is behind a tab you have NOT
 * opened, so fetching those rows to count them would defeat the filter.
 *
 * Every status is present in the result, zeros included — a tab that reads
 * "Cancelled 0" is information, a tab with no number looks broken.
 */
export async function countOrdersByStatus(
  filter: Omit<OrderFilter, "status"> = {},
): Promise<Record<DeliveryStatus, number>> {
  const rows = await prisma.order.groupBy({
    by: ["status"],
    where: orderWhere(filter),
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    DELIVERY_STATUS_KEYS.map((s) => [s, 0]),
  ) as Record<DeliveryStatus, number>;

  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}

/**
 * One customer's orders, newest first.
 *
 * Matched on `customerId` rather than the name or phone snapshot sitting on the
 * order: those are frozen on purpose, so someone who renamed or moved would
 * drop out of their own history if the snapshot were the join key.
 *
 * Orders placed for a walk-in — `customerId` null — belong to nobody and are
 * correctly absent here.
 */
export async function listOrdersByCustomer(
  customerId: number,
): Promise<OrderWithItems[]> {
  return prisma.order.findMany({
    where: { customerId },
    include: { items: true },
    orderBy: { placedAt: "desc" },
  });
}

/** A day label (`YYYY-MM-DD`) as a UTC-midnight anchor, for exact arithmetic. */
function dayAnchor(label: string) {
  return new Date(`${label}T00:00:00Z`);
}

/** Never plot fewer days than this — a two-point line isn't a trend. */
const MIN_TREND_DAYS = 7;

/**
 * Revenue and order count per day, oldest day first.
 *
 * Bucketed by the **Yangon** calendar day, not the UTC one: an order placed at
 * 01:00 local is still 18:30 the previous day in UTC, so grouping on the raw
 * timestamp would file it under yesterday. formatDate() already names the day
 * correctly, so the grouping key comes from it rather than from SQL — this also
 * keeps the query inside Prisma, where `date_trunc … AT TIME ZONE` can't go.
 *
 * The window ends today and reaches back to the first order, capped at
 * `maxDays`. A fixed 30 days on a shop that opened last week is 25 days of flat
 * zero pretending to be a trend — the chart should show the history that
 * exists, and grow into the full window as the shop does.
 *
 * Days inside the window with no orders ARE returned, as zero: skipping them
 * would slope the line straight through a quiet week and overstate it.
 *
 * Cancelled orders are excluded — they were voided before dispatch, so no money
 * moved.
 */
export async function revenueByDay(maxDays = 30): Promise<RevenueDay[]> {
  const notCancelled = { status: { not: "cancelled" } } as const;

  const first = await prisma.order.findFirst({
    where: notCancelled,
    orderBy: { placedAt: "asc" },
    select: { placedAt: true },
  });

  // Anchor on today's Yangon date, then step back in whole UTC days. Anchoring
  // at UTC midnight makes the arithmetic exact — these are date labels, never
  // instants, and Myanmar has no DST to shift them.
  const anchor = dayAnchor(formatDate(new Date()));

  let days = maxDays;
  if (first) {
    const span =
      Math.round(
        (anchor.getTime() - dayAnchor(formatDate(first.placedAt)).getTime()) /
          86_400_000,
      ) + 1;
    days = Math.min(maxDays, Math.max(MIN_TREND_DAYS, span));
  }

  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(anchor);
    d.setUTCDate(d.getUTCDate() - i);
    labels.push(d.toISOString().slice(0, 10));
  }

  // Yangon is UTC+06:30, so the window opens up to 7h before the first label's
  // UTC midnight. Anything that over-reaches lands in a bucket we don't keep.
  const since = new Date(dayAnchor(labels[0]).getTime() - 7 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: { ...notCancelled, placedAt: { gte: since } },
    select: { placedAt: true, total: true },
  });

  const buckets = new Map(labels.map((day) => [day, { revenue: 0, orders: 0 }]));
  for (const order of orders) {
    const bucket = buckets.get(formatDate(order.placedAt));
    if (!bucket) continue;
    bucket.revenue += order.total;
    bucket.orders += 1;
  }

  return labels.map((day) => ({ day, ...buckets.get(day)! }));
}

/**
 * The best sellers, by units rather than by revenue — this answers "what is
 * leaving the shelf", which is the question the products page can't answer.
 *
 * Labelled by SKU, with the product name carried alongside for the chart to
 * reveal on click: cosmetic names are long enough to wrap an axis gutter onto
 * three lines, and the SKU is both short and unique.
 *
 * Grouped on `productId` rather than the line's snapshot name, so a product
 * renamed mid-life stays one bar instead of splitting into two. Cancelled
 * orders never shipped, so their lines don't count.
 */
export async function topProductsByUnits(limit = 6): Promise<LabelledCount[]> {
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { not: "cancelled" } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });

  const ids = rows
    .map((row) => row.productId)
    .filter((id): id is number => id !== null);

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, sku: true, name: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  return rows.map((row) => {
    // productId is null once a product is deleted. Those units really were
    // sold, so the bar stays rather than quietly dropping out of the totals —
    // it just has no SKU or name left to show.
    const product = row.productId === null ? null : byId.get(row.productId);
    return {
      label: product?.sku ?? "—",
      detail: product?.name ?? "Deleted product",
      value: row._sum.quantity ?? 0,
    };
  });
}

/**
 * Orders per destination city, busiest first — the shape of a delivery run.
 *
 * Counted on the order's own `city` snapshot rather than the customer's current
 * one: this is where the parcel actually went, and someone who has since moved
 * must not retroactively empty out the city they used to live in.
 */
export async function ordersByCity(): Promise<LabelledCount[]> {
  const rows = await prisma.order.groupBy({
    by: ["city"],
    where: { status: { not: "cancelled" } },
    _count: { _all: true },
    orderBy: { _count: { city: "desc" } },
  });

  return rows.map((row) => ({ label: row.city, value: row._count._all }));
}

export async function getOrder(id: number): Promise<OrderWithItems | null> {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
}

/**
 * Lookup by the human-facing `RL-` code, which is what the detail URL carries.
 * Same reasoning as getCustomerByCode(): the code is on screen and immutable,
 * `id` is an internal surrogate nobody ever sees.
 *
 * Uppercased first — codes are stored uppercase, but a URL comes back lowercased
 * often enough that a case-exact match would 404 on a link that is otherwise
 * correct.
 *
 * The status history comes along because it is the point of the detail page:
 * the list already shows where an order *is*, only this page says how it got
 * there. Newest first, so the current status is the one staff see without
 * scrolling.
 */
export async function getOrderByCode(
  code: string,
): Promise<OrderDetail | null> {
  return prisma.order.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: {
      items: true,
      statusEvents: { orderBy: { changedAt: "desc" } },
    },
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
 *
 * Throws OutOfStockError if any line asks for more than is on the shelf. The
 * form and the action both check first, but only this check is safe against two
 * staff saving the last unit at the same moment.
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
            note: input.note,
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
          // `stock >= quantity` in the WHERE clause is what actually forbids
          // overselling. Checking before the write would leave a gap in which
          // the other save lands; here the condition is evaluated against the
          // locked row, so exactly one of the two can win and the loser gets
          // zero rows back.
          //
          // updated_at is set by hand because @updatedAt only fires on writes
          // that go through Prisma's query builder.
          const updated = await tx.$executeRaw`
            UPDATE "products"
            SET "stock" = "stock" - ${quantity},
                "updated_at" = now()
            WHERE "id" = ${productId} AND "stock" >= ${quantity}
          `;

          if (updated === 0) {
            // Either the shelf is short or the product was deleted since the
            // form loaded. Read it back to say which; the throw rolls the whole
            // order back either way.
            const product = await tx.product.findUnique({
              where: { id: productId },
              select: { name: true, stock: true },
            });
            if (!product) {
              throw new Error("A product on this order no longer exists.");
            }
            throw new OutOfStockError(product.name, product.stock, quantity);
          }
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

/**
 * Overwrites the order's free-text note. Unlike the status history, this is a
 * single mutable field — the point is "what does staff need to know right
 * now", not a log of every edit.
 */
export async function updateOrderNote(
  id: number,
  note: string,
): Promise<OrderWithItems> {
  return prisma.order.update({
    where: { id },
    data: { note },
    include: { items: true },
  });
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
