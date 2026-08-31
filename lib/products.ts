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
export type ProductActivity = "active" | "deactivate";

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
  deactivate: {
    label: "Deactivate",
    description: "Hidden from the order picker",
    chip: "bg-cancelled-soft text-cancelled",
    dot: "bg-cancelled",
  },
};

export const PRODUCT_ACTIVITY_KEYS = Object.keys(
  PRODUCT_ACTIVITY,
) as ProductActivity[];

export function productActivity(isActive: boolean): ProductActivity {
  return isActive ? "active" : "deactivate";
}

/**
 * One initial-letter band of the product list: `{ letter: "L", items: [...] }`.
 *
 * `items` is the field name Base UI's Combobox looks for to recognise a group,
 * so the same shape feeds both the products page and the order form's picker
 * without either having to reshape it.
 */
export type ProductGroup = { letter: string; items: Product[] };

/**
 * Anything that doesn't start with a Latin letter — a Burmese name, a digit, a
 * bare SKU — files under `#`. Grouping those by their own first character would
 * make a band per name and defeat the point.
 */
function groupLetter(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(ch) ? ch : "#";
}

/**
 * Products in initial-letter bands, A–Z with `#` last.
 *
 * Shared so the products page and the new-order picker present one catalogue
 * the same way: staff learn where a product sits on the list they browse, and
 * the picker they type into has to reward that memory rather than reshuffle it.
 *
 * Sorted here rather than trusted from the caller. Postgres orders by the
 * column's collation and `localeCompare` by the runtime's, and the two disagree
 * about case and punctuation — sorting in JS is what makes the two screens
 * agree, whichever query fed them.
 *
 * SKU breaks the tie, and it has to: a name is not unique here. Four sizes of
 * one product are four rows reading `AFDF အကြီး`, so comparing names alone
 * returns 0 for all of them and leaves a stable sort holding whatever order the
 * query happened to return — which is not the same order for two queries with
 * different filters, so the two screens listed the same four products
 * differently. SKU is unique, so appending it makes the order total.
 */
export function groupProductsByLetter(products: Product[]): ProductGroup[] {
  const groups = new Map<string, Product[]>();

  const sorted = [...products].sort(
    (a, b) => a.name.localeCompare(b.name) || a.sku.localeCompare(b.sku),
  );

  for (const product of sorted) {
    const letter = groupLetter(product.name);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter)!.push(product);
  }

  return [...groups.keys()]
    .sort((a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)))
    .map((letter) => ({ letter, items: groups.get(letter)! }));
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

/**
 * Price is whole kyats — never a float, see CLAUDE.md. Thousands separators are
 * accepted because `12,000` is how the number is read back off the screen.
 *
 * Unlike stock, an empty field is NOT zero and zero is not a price: a product
 * that costs nothing is a typo, and it would quietly add itself free to every
 * order placed afterwards. Returns null for anything under 1 so the caller can
 * refuse it rather than store it.
 */
export function parsePrice(raw: string): number | null {
  const digits = raw.trim().replace(/,/g, "");
  if (!/^\d+$/.test(digits)) return null;
  const price = Number.parseInt(digits, 10);
  return Number.isSafeInteger(price) && price >= 1 ? price : null;
}
