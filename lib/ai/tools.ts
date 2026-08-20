/**
 * The assistant's tool surface: two read-only lookups, nothing that
 * mutates data. See lib/ai/assistant.ts for the loop that calls these.
 *
 * No customer lookup, by request — the assistant doesn't search customers.
 */

import type { FunctionDeclaration } from "@google/genai";

import { getOrderByCode } from "@/lib/order-store";
import { findProductBySku, listProducts } from "@/lib/product-store";

export const ASSISTANT_TOOLS: FunctionDeclaration[] = [
  {
    name: "lookup_order",
    description:
      "Look up an order by its RL- invoice code (e.g. RL-260804TXI). Returns status, line items, total and delivery status history.",
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
      "List products as a Name/SKU/Stock table. Omit `query` to list the whole catalog; pass a product name or exact SKU to check stock for one product.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional product name or exact SKU to filter to",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
];

// Only bites when a query narrows the catalog down to a search-result-shaped
// list — browsing the whole catalog with no query returns every row.
const MAX_STOCK_MATCHES = 10;

async function lookupOrder(code: string): Promise<string> {
  const order = await getOrderByCode(code);
  if (!order) return `No order found with code ${code}.`;

  const { code: orderCode, status, total, placedAt, customerName, phone, city, address, items, statusEvents } = order;
  return JSON.stringify({
    code: orderCode,
    status,
    total,
    placedAt,
    customerName,
    phone,
    city,
    address,
    items: items.map(({ name, unitPrice, quantity }) => ({ name, unitPrice, quantity })),
    statusEvents: statusEvents.map(({ status, changedAt, note }) => ({ status, changedAt, note })),
  });
}

async function listProductsTable(query?: string): Promise<string> {
  const q = query?.trim();

  let products;
  if (q) {
    const exact = await findProductBySku(q);
    products = exact ? [exact] : (await listProducts(q)).slice(0, MAX_STOCK_MATCHES);
  } else {
    products = await listProducts();
  }

  if (products.length === 0) {
    return q ? `No products matching '${q}'.` : "No products in the catalog.";
  }

  const rows = products.map(({ name, sku, stock }) => `| ${name} | ${sku} | ${stock} |`);
  return ["| Name | SKU | Stock |", "| --- | --- | --- |", ...rows].join("\n");
}

export async function runTool(name: string, input: unknown): Promise<string> {
  const args = input as Record<string, unknown>;

  switch (name) {
    case "lookup_order":
      return lookupOrder(String(args.code ?? ""));
    case "list_products":
      return listProductsTable(args.query ? String(args.query) : undefined);
    default:
      return `Unknown tool: ${name}`;
  }
}
