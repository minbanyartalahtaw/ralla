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
 * Whether a product can be added to new orders.
 *
 * The database stores this as the boolean `Product.isActive`; this union is the
 * UI's name for the same thing, so the two labels aren't hand-typed at call
 * sites. Use `productActivity()` to cross over.
 */
export type ProductActivity = "active" | "discontinued";

type ActivityMeta = {
  label: string;
  description: string;
  /** Tailwind classes for the chip. */
  chip: string;
  /** Tailwind class for the dot. */
  dot: string;
};

/**
 * Reuses the delivered/cancelled tints rather than adding new colors: this is
 * the same green-means-live, grey-means-retired reading staff already learned
 * on the orders table.
 */
export const PRODUCT_ACTIVITY: Record<ProductActivity, ActivityMeta> = {
  active: {
    label: "Active",
    description: "Selectable on a new order",
    chip: "bg-delivered-soft text-delivered",
    dot: "bg-delivered",
  },
  discontinued: {
    label: "Discontinued",
    description: "Hidden from the order picker",
    chip: "bg-cancelled-soft text-cancelled",
    dot: "bg-cancelled",
  },
};

export const PRODUCT_ACTIVITY_KEYS = Object.keys(
  PRODUCT_ACTIVITY,
) as ProductActivity[];

export function productActivity(isActive: boolean): ProductActivity {
  return isActive ? "active" : "discontinued";
}

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

/**
 * Stock is a count of physical units, typed by hand. Only digits are accepted:
 * "2.5 lipsticks" and a negative count are both mistakes, and rounding one into
 * a plausible number would hide the typo instead of surfacing it.
 *
 * Returns null when the input can't be read as a count, so callers can tell an
 * empty or malformed field apart from a genuine zero.
 */
export function parseStock(raw: string): number | null {
  const digits = raw.trim().replace(/,/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const stock = Number.parseInt(digits, 10);
  return Number.isSafeInteger(stock) ? stock : null;
}
