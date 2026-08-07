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

export async function listProducts(): Promise<Product[]> {
  return prisma.product.findMany({
    // Active first, then alphabetical — discontinued items sink to the bottom.
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
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
