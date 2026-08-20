/**
 * The assistant's tool surface: four read-only lookups, nothing that
 * mutates data. See lib/ai/assistant.ts for the loop that calls these.
 */

import type { FunctionDeclaration } from "@google/genai";

import { getCustomerByCode } from "@/lib/customer-store";
import { getOrderByCode } from "@/lib/order-store";
import { findProductBySku, listProducts } from "@/lib/product-store";

export const ASSISTANT_TOOLS: FunctionDeclaration[] = [
  {
    name: "lookup_customer",
    description:
      "Look up a customer by their RLC- customer code (e.g. RLC-1015). Returns name, TikTok handle, phone, city, address and notes.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        code: { type: "string", description: "Customer code, e.g. RLC-1015" },
      },
      required: ["code"],
      additionalProperties: false,
    },
  },
  {
    name: "lookup_stock",
    description:
      "Look up current stock for a product by name or exact SKU. Returns matching products with their current stock counts.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Product name or SKU to search for" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
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
      "List every product's name and SKU. Useful for browsing the catalog or resolving which product someone means before checking its stock.",
    parametersJsonSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
];

const MAX_STOCK_MATCHES = 10;

async function lookupCustomer(code: string): Promise<string> {
  const customer = await getCustomerByCode(code);
  if (!customer) return `No customer found with code ${code}.`;

  const { code: customerCode, name, tiktokUsername, phone, city, address, note } = customer;
  return JSON.stringify({ code: customerCode, name, tiktokUsername, phone, city, address, note });
}

async function lookupStock(query: string): Promise<string> {
  const exact = await findProductBySku(query);
  const matches = exact ? [exact] : await listProducts(query);

  if (matches.length === 0) return `No products matching '${query}'.`;

  return JSON.stringify(
    matches
      .slice(0, MAX_STOCK_MATCHES)
      .map(({ name, sku, stock, isActive }) => ({ name, sku, stock, isActive })),
  );
}

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

async function listAllProducts(): Promise<string> {
  const products = await listProducts();
  if (products.length === 0) return "No products in the catalog.";

  return JSON.stringify(products.map(({ name, sku }) => ({ name, sku })));
}

export async function runTool(name: string, input: unknown): Promise<string> {
  const args = input as Record<string, unknown>;

  switch (name) {
    case "lookup_customer":
      return lookupCustomer(String(args.code ?? ""));
    case "lookup_stock":
      return lookupStock(String(args.query ?? ""));
    case "lookup_order":
      return lookupOrder(String(args.code ?? ""));
    case "list_products":
      return listAllProducts();
    default:
      return `Unknown tool: ${name}`;
  }
}
