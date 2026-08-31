/**
 * The assistant's tool surface: three read-only lookups and the clock, nothing
 * that mutates data. See lib/ai/assistant.ts for the loop that calls these.
 *
 * It is kept small on purpose — shop_summary and stale_orders were dropped as
 * the surface got hard to hold in one head, along with list_products' lowStock
 * filter, and no customer lookup was ever added. All of it is in the history if
 * it comes back.
 *
 * The lookups answer in finished markdown rather than raw data, so the loop
 * can yield them to the client as-is. Relaying a table through a second model
 * turn only pays the model to retype it as output tokens, which cost six times
 * what input does. current_time is the exception — see the note on it below.
 */

import type { FunctionDeclaration } from "@google/genai";

import {
  DELIVERY_STATUS,
  TIME_ZONE,
  formatDateTime,
  formatKyat,
} from "@/lib/orders";
import { getOrderByCode, salesOnDay } from "@/lib/order-store";
import {
  findProductBySku,
  listProducts,
  listProductsBelowStock,
} from "@/lib/product-store";

/**
 * Descriptions are deliberately short. They ride along on every request as
 * input tokens, and the model picks better from two crisp lines than from two
 * paragraphs.
 */
export const ASSISTANT_TOOLS: FunctionDeclaration[] = [
  {
    name: "lookup_order",
    description:
      "One order by its RL- invoice code (e.g. RL-260804TXI). Returns the date, customer, phone, address, status, line items, total and note.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Order invoice code, e.g. RL-260804TXI",
        },
      },
      required: ["code"],
      additionalProperties: false,
    },
  },
  {
    name: "current_time",
    description:
      "The date and time right now in Myanmar (Asia/Yangon). Call it before answering anything that depends on today's date or on how long ago something happened.",
    parametersJsonSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "daily_sales",
    description:
      "Orders taken and money made on ONE Yangon calendar day. It totals a single day and cannot add up a week, a month or a range — for \"yesterday\" or any other relative day, call current_time first and work out the date.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "The day to total, as YYYY-MM-DD, e.g. 2026-08-30",
        },
      },
      required: ["date"],
      additionalProperties: false,
    },
  },
  {
    name: "list_products",
    description:
      "Product table with price and stock. No arguments browses the whole catalogue; `query` narrows to one product by name or exact SKU; `stockBelow` lists what is running out, emptiest first.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional product name or exact SKU to filter to",
        },
        stockBelow: {
          type: "integer",
          description:
            'List only products with fewer than this many units left. Pass the number staff name ("under 20" is 20); pass 10 when they ask what is running low without naming one.',
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
];

/** Rows returned when a product search is narrowed. Browsing is uncapped. */
const MAX_STOCK_MATCHES = 10;

/**
 * What "running low" means when nobody says a number. The tool description
 * asks the model for it, but a model that asks for the low-stock list and
 * forgets the threshold means the question, not a browse of the catalogue —
 * so the default lives here as well, where it can't be forgotten.
 */
const DEFAULT_LOW_STOCK = 10;

function table(headers: string[], rows: string[][]): string {
  // A pipe inside a cell ends the cell, and product names and addresses are
  // typed by hand — one stray "|" would shear the rest of the row off.
  const cell = (value: string) => value.replace(/\|/g, "\\|");

  return [
    `| ${headers.map(cell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

/**
 * The clock the shop runs on.
 *
 * Not a fact the model can be left to supply: it knows only what its training
 * ended on, and the server it runs on may sit in any zone, so "today" is wrong
 * twice over unless something asks. It resolves through TIME_ZONE like every
 * other timestamp in the app — Myanmar is UTC+06:30, so anything before 06:30
 * local lands on the previous UTC day.
 *
 * Deliberately *not* display-ready, unlike the two lookups. A clock reading is
 * as often a step towards an answer as the answer itself, and yielding it
 * straight to the client would end the turn showing the time where a sentence
 * about an order was wanted.
 *
 * The weekday rides along because staff say "Monday" far more than they say a
 * date, and it costs one word to save a second question.
 */
function currentTime(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
  });

  return `${formatDateTime(now)} (${weekday}, Myanmar time)`;
}

/**
 * One day's takings: two figures, and the day they belong to.
 *
 * The date is echoed back with its weekday because the model worked it out from
 * current_time rather than being told it — if it lands a day off, the answer
 * says so on its own face instead of quietly reporting the wrong Tuesday. That
 * is also why the reply is only ever one day: a range would be several tool
 * calls, and each one is another chance to slip a day.
 *
 * Cancelled orders are in neither figure — see salesOnDay().
 */
async function dailySales(date: string): Promise<string> {
  const day = date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return `'${date}' ကို ရက်စွဲအဖြစ် မဖတ်နိုင်ပါ။ YYYY-MM-DD ပုံစံ လိုပါတယ်။`;
  }

  let sales;
  try {
    sales = await salesOnDay(day);
  } catch {
    // Shaped like a date but isn't one — 2026-02-31, say.
    return `'${date}' ဆိုတဲ့ ရက်စွဲ မရှိပါ။`;
  }

  const weekday = new Date(`${day}T00:00:00+06:30`).toLocaleDateString("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
  });

  if (sales.orders === 0) return `**${day}** (${weekday}) မှာ order မရှိပါ။`;

  return [
    `**${day}** (${weekday})`,
    "",
    `- **Total orders:** ${sales.orders}`,
    `- **Total price:** ${formatKyat(sales.total)}`,
  ].join("\n");
}

/**
 * One order as a finished bullet list — the same eight lines, in the same
 * order, every time.
 *
 * It used to hand the model JSON to narrate. What came back was a retelling
 * that renamed every field in Burmese and reordered them turn by turn, so no
 * two lookups looked alike and staff had to read the label before they could
 * find the phone number. Fixed lines can't drift, and the labels stay English
 * to match the columns on the order page they came from.
 *
 * A list rather than a table: the values here are one per field, and a
 * two-column table of them is a lot of rule-work to read on a phone.
 * list_products stays a table — that one is genuinely a grid.
 *
 * Timestamps and money are formatted here rather than handed over raw. Yangon
 * is UTC+06:30, so printing a Date raw is getting evening orders wrong by a
 * day; kyats are an integer count, so something has to render them, and doing
 * it here renders them the one way.
 */
async function lookupOrder(code: string): Promise<string> {
  const order = await getOrderByCode(code);
  if (!order) return `${code} ဆိုတဲ့ order မတွေ့ပါ။`;

  // SKU, not the name, by request — it is what the shelf and the product table
  // are labelled with. The name is the fallback for the lines that have no SKU
  // to show: an ad-hoc line, or one written before the column existed.
  const items = order.items
    .map(({ name, sku, quantity }) => `  - ${sku || name} ×${quantity}`)
    .join("\n");

  return [
    `**${order.code}**`,
    "",
    `- **Date:** ${formatDateTime(order.placedAt)}`,
    `- **Name:** ${order.customerName}`,
    `- **Phone:** ${order.phone}`,
    `- **Address:** ${order.address}၊ ${order.city}`,
    `- **Status:** ${DELIVERY_STATUS[order.status].label}`,
    "- **Items:**",
    items,
    `- **Total:** ${formatKyat(order.total)}`,
    `- **Note:** ${order.note.trim() || "—"}`,
  ].join("\n");
}

async function listProductsTable(
  query?: string,
  stockBelow?: number,
): Promise<string> {
  if (stockBelow !== undefined) {
    const products = await listProductsBelowStock(stockBelow);

    return products.length === 0
      ? `Stock ${stockBelow} အောက် ရောက်နေတဲ့ ပစ္စည်း မရှိပါ။`
      : table(
          ["Name", "SKU", "Price", "Stock"],
          products.map((product) => [
            product.name,
            product.sku,
            formatKyat(product.price),
            String(product.stock),
          ]),
        );
  }

  const q = query?.trim();

  let products;
  if (q) {
    const exact = await findProductBySku(q);
    products = exact
      ? [exact]
      : (await listProducts(q)).slice(0, MAX_STOCK_MATCHES);
  } else {
    products = await listProducts();
  }

  if (products.length === 0) {
    return q
      ? `'${q}' နဲ့ကိုက်ညီတဲ့ ပစ္စည်း မတွေ့ပါ။`
      : "ပစ္စည်းစာရင်းမှာ ဘာမှမရှိသေးပါ။";
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
 * `undefined` when the model didn't ask for the low-stock list at all, and the
 * default when it asked but sent something unusable — `true`, "ten", a zero.
 * Falling back to a browse of the whole catalogue there would answer a
 * question nobody asked.
 */
function stockThreshold(value: unknown): number | undefined {
  if (value === undefined || value === null || value === false)
    return undefined;

  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_LOW_STOCK;
}

export async function runTool(name: string, input: unknown): Promise<string> {
  const args = input as Record<string, unknown>;

  switch (name) {
    case "lookup_order":
      return lookupOrder(String(args.code ?? ""));
    case "current_time":
      return currentTime();
    case "daily_sales":
      return dailySales(String(args.date ?? ""));
    case "list_products":
      return listProductsTable(
        args.query ? String(args.query) : undefined,
        stockThreshold(args.stockBelow),
      );
    default:
      return `Unknown tool: ${name}`;
  }
}
