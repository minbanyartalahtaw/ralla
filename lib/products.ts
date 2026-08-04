/**
 * Product domain.
 *
 * The Product shape comes from the Prisma schema. Safe to import from both
 * server and client — persistence lives in lib/product-store.ts.
 */

import type { ProductModel } from "@/generated/prisma/models";

/** The row shape Prisma returns. Aliased so app code reads naturally. */
export type Product = ProductModel;

/** Everything the create form supplies. The rest is assigned by the database. */
export type NewProduct = Omit<
  Product,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * SKUs are compared exactly, so they're stored in one canonical shape:
 * uppercase, trimmed, inner whitespace collapsed to dashes. Without this,
 * `lip-vm-01` and `LIP-VM-01` would be two different products.
 */
export function normalizeSku(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "-");
}

/** Letters, digits and dashes; 2–24 characters; must start alphanumeric. */
export function isValidSku(sku: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{1,23}$/.test(sku);
}
