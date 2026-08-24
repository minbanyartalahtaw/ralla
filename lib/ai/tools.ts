/**
 * The assistant's tool surface: four read-only lookups, nothing that
 * mutates data. See lib/ai/assistant.ts for the loop that calls these.
 *
 * No customer lookup, by request — the assistant doesn't search customers.
 *
 * Three of the four answer in finished markdown rather than raw data, so the
 * loop can yield them to the client as-is. Relaying a table through a second
 * model turn only pays the model to retype it as output tokens, which cost
 * six times what input does. lookup_order is the exception: it returns JSON
 * because a question about one order needs narrating, not tabulating.
 */

import type { FunctionDeclaration } from "@google/genai";

import {
  DELIVERY_STATUS,
  DELIVERY_STATUS_KEYS,
  PAYMENT_METHOD,
  formatDate,
  formatDateTime,
  formatKyat,
} from "@/lib/orders";
import {
  codOutstanding,
  countOrdersByStatus,
  getOrderByCode,
  staleOrders,
  todaysOrders,
  unitsSoldByProduct,
} from "@/lib/order-store";
import {
  LOW_STOCK_THRESHOLD,
  findProductBySku,
  listLowStockProducts,
  listProducts,
} from "@/lib/product-store";

/**
 * Descriptions are deliberately short. They ride along on every request as
 * input tokens, and a flash-lite model picks better from four crisp lines
 * than from four paragraphs.
 */
export const ASSISTANT_TOOLS: FunctionDeclaration[] = [
  {
    name: "lookup_order",
    description:
      "One order by its RL- invoice code (e.g. RL-260804TXI). Returns status, payment, line items, total, note and delivery history.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Order invoice code, e.g. RL-260804TXI" },
      },
      required: ["code"],
      additionalProperties: false,
    },
  },
  {
    name: "list_products",
    description:
      "Product table with price and stock. No arguments browses the whole catalogue; `query` narrows to one product by name or exact SKU; `lowStock` lists only what is running out, with units sold in the last 30 days.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional product name or exact SKU to filter to",
        },
        lowStock: {
          type: "boolean",
          description: "True to list only products running out of stock",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "shop_summary",
    description:
      "Today's orders and revenue, delivery status counts, cash-on-delivery money still to collect, and what is low on stock. Takes no arguments — use it for any general 'how are we doing' question.",
    parametersJsonSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "stale_orders",
    description:
      "Open orders that have not changed status in a while — the ones being forgotten. Defaults to 3 days.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description: "Minimum days without a status change. Defaults to 3.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
];

/** Rows returned when a product search is narrowed. Browsing is uncapped. */
const MAX_STOCK_MATCHES = 10;

const DEFAULT_STALE_DAYS = 3;

function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

/**
 * Timestamps and money are formatted here rather than handed over raw.
 *
 * JSON.stringify turns a Date into UTC, and Yangon is UTC+06:30 — asking the
 * model to shift it is asking it to get evening orders wrong by a day. Money
 * goes the same way: a formatted string is one it can quote back, where an
 * integer is one it has to render, and it renders kyats inconsistently.
 */
async function lookupOrder(code: string): Promise<string> {
  const order = await getOrderByCode(code);
  if (!order) return `No order found with code ${code}.`;

  return JSON.stringify({
    code: order.code,
    status: order.status,
    paymentMethod: PAYMENT_METHOD[order.paymentMethod],
    total: formatKyat(order.total),
    placedAt: formatDateTime(order.placedAt),
    note: order.note,
    customerName: order.customerName,
    phone: order.phone,
    city: order.city,
    address: order.address,
    items: order.items.map(({ name, unitPrice, quantity }) => ({
      name,
      unitPrice: formatKyat(unitPrice),
      quantity,
    })),
    statusEvents: order.statusEvents.map(({ status, changedAt, note }) => ({
      status,
      changedAt: formatDateTime(changedAt),
      note,
    })),
  });
}

async function listProductsTable(query?: string, lowStock?: boolean): Promise<string> {
  if (lowStock) {
    const products = await listLowStockProducts();
    if (products.length === 0) {
      return `ကုန်တော့မယ့် ပစ္စည်း မရှိပါ — အားလုံး ${LOW_STOCK_THRESHOLD} ခုအထက် ရှိပါတယ်။`;
    }

    // "What's running out" is only half the restock question; the other half
    // is how fast it leaves the shelf. Five units is a crisis at 40 sold a
    // month and a non-event at two. Fetched only on this branch — browsing
    // the catalogue doesn't need it and it costs a second query.
    const sold = await unitsSoldByProduct(30);

    return table(
      ["Name", "SKU", "Stock", "Sold 30d"],
      products.map((product) => [
        product.name,
        product.sku,
        String(product.stock),
        String(sold.get(product.id) ?? 0),
      ]),
    );
  }

  const q = query?.trim();

  let products;
  if (q) {
    const exact = await findProductBySku(q);
    products = exact ? [exact] : (await listProducts(q)).slice(0, MAX_STOCK_MATCHES);
  } else {
    products = await listProducts();
  }

  if (products.length === 0) {
    return q ? `'${q}' နဲ့ကိုက်ညီတဲ့ ပစ္စည်း မတွေ့ပါ။` : "ပစ္စည်းစာရင်းမှာ ဘာမှမရှိသေးပါ။";
  }

  return table(
    ["Name", "SKU", "Price", "Stock"],
    products.map((product) => [
      product.name,
      product.sku,
      formatKyat(product.price),
      String(product.stock),
    ]),
  );
}

/**
 * The four numbers staff open the dashboard for, in one round trip. Written
 * in Burmese here because it reaches the client without passing back through
 * the model, so nothing downstream translates it.
 */
async function shopSummary(): Promise<string> {
  const [today, counts, cod, low] = await Promise.all([
    todaysOrders(),
    countOrdersByStatus(),
    codOutstanding(),
    listLowStockProducts(),
  ]);

  const statuses = DELIVERY_STATUS_KEYS.map(
    (key) => `${DELIVERY_STATUS[key].label} ${counts[key]}`,
  ).join(" · ");

  return [
    `**ဒီနေ့ (${formatDate(new Date())})** — order ${today.count} ခု၊ ${formatKyat(today.total)}`,
    `**Delivery status** — ${statuses}`,
    `**COD ကောက်ရန်** — order ${cod.count} ခု၊ ${formatKyat(cod.total)}`,
    low.length === 0
      ? "**Stock** — ကုန်တော့မယ့် ပစ္စည်း မရှိပါ။"
      : `**Stock နည်းနေ** — ${low.map((p) => `${p.name} (${p.stock})`).join("၊ ")}`,
  ].join("\n\n");
}

async function staleOrdersTable(days?: number): Promise<string> {
  // A model that decides "a while" means zero days would return every open
  // order, which is the list staff already have.
  const minDays = typeof days === "number" && days > 0 ? Math.floor(days) : DEFAULT_STALE_DAYS;
  const orders = await staleOrders(minDays);

  if (orders.length === 0) {
    return `${minDays} ရက်ကျော် မရွေ့ဘဲ ရပ်နေတဲ့ order မရှိပါ။`;
  }

  return table(
    ["Code", "Status", "ရပ်နေချိန်", "Customer", "Total"],
    orders.map((order) => [
      order.code,
      DELIVERY_STATUS[order.status].label,
      `${order.daysStalled} ရက်`,
      order.customerName,
      formatKyat(order.total),
    ]),
  );
}

export async function runTool(name: string, input: unknown): Promise<string> {
  const args = input as Record<string, unknown>;

  switch (name) {
    case "lookup_order":
      return lookupOrder(String(args.code ?? ""));
    case "list_products":
      return listProductsTable(
        args.query ? String(args.query) : undefined,
        args.lowStock === true,
      );
    case "shop_summary":
      return shopSummary();
    case "stale_orders":
      return staleOrdersTable(
        typeof args.days === "number" ? args.days : Number(args.days) || undefined,
      );
    default:
      return `Unknown tool: ${name}`;
  }
}
