/**
 * Product persistence.
 *
 * Server-only — never import this from a Client Component. The client-safe
 * type and SKU helpers live in lib/products.ts.
 */

import { prisma } from "@/lib/prisma";
import type { NewProduct, Product } from "@/lib/products";

export type { Product };

/** Everything the order form's product picker needs. */
export async function listActiveProducts(): Promise<Product[]> {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

/** Trimmed only — a product name is free text, so inner spaces are real. */
export function normalizeProductQuery(query: string | undefined): string {
  return (query ?? "").trim();
}

/**
 * Every product, or the ones whose name contains `query`.
 *
 * Name only for now. SKUs are matched exactly everywhere else in the app, and
 * folding them into this search would make a lookup for `LIP` return products
 * whose name merely mentions it.
 *
 * `contains` and case-insensitive: staff type a word from the middle of a
 * cosmetic name far more often than they type its start.
 */
export async function listProducts(query?: string): Promise<Product[]> {
  const name = normalizeProductQuery(query);

  return prisma.product.findMany({
    where: name === "" ? undefined : { name: { contains: name, mode: "insensitive" } },
    // Active first, then alphabetical — discontinued items sink to the bottom.
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

/**
 * Active products under `threshold` units, emptiest first — the restock list.
 *
 * Strictly under, not at: staff ask for "under 10" and mean the nine, and a
 * threshold that quietly included ten would be answering a different question
 * from the one they typed.
 *
 * Active only, unlike listProducts(): a discontinued line sitting at zero is
 * not a restock decision, it is just discontinued.
 */
export async function listProductsBelowStock(threshold: number): Promise<Product[]> {
  return prisma.product.findMany({
    where: { isActive: true, stock: { lt: threshold } },
    orderBy: [{ stock: "asc" }, { name: "asc" }],
  });
}

export async function getProduct(id: number): Promise<Product | null> {
  return prisma.product.findUnique({ where: { id } });
}

/** SKUs are unique, so this doubles as the duplicate check on create. */
export async function findProductBySku(sku: string): Promise<Product | null> {
  return prisma.product.findUnique({ where: { sku } });
}

export async function createProduct(input: NewProduct): Promise<Product> {
  return prisma.product.create({ data: input });
}

/**
 * Deactivating hides a product from the order form's picker without deleting
 * it. Deletion would orphan the `productId` on every past order line, so
 * discontinuing is always a flag change, never a delete.
 */
export async function setProductActive(
  id: number,
  isActive: boolean,
): Promise<Product> {
  return prisma.product.update({ where: { id }, data: { isActive } });
}

/**
 * Renames a product's SKU.
 *
 * Callers must have already checked findProductBySku for a collision with
 * another product — the unique index is the backstop, not the check.
 */
export async function setProductSku(id: number, sku: string): Promise<Product> {
  return prisma.product.update({ where: { id }, data: { sku } });
}

/** Sets the display name shown on the products table and order form picker. */
export async function setProductName(
  id: number,
  name: string,
): Promise<Product> {
  return prisma.product.update({ where: { id }, data: { name } });
}

/**
 * Sets the units on hand to an absolute count.
 *
 * Absolute rather than a delta because this is a stock *correction* — staff
 * count the shelf and type what they see. A delta would need to agree with a
 * number they never looked at.
 */
export async function setProductStock(
  id: number,
  stock: number,
): Promise<Product> {
  return prisma.product.update({ where: { id }, data: { stock } });
}

/**
 * Sets the list price for future orders, in whole kyats.
 *
 * Past orders are untouched and must stay that way: `OrderItem.unitPrice` is a
 * snapshot taken at save time, so a price rise today cannot rewrite what last
 * month's revenue was. This only changes what the next order will cost.
 */
export async function setProductPrice(
  id: number,
  price: number,
): Promise<Product> {
  return prisma.product.update({ where: { id }, data: { price } });
}
