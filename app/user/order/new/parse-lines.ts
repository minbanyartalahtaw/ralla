/**
 * Turns the form's parallel line arrays into order lines.
 *
 * Kept out of actions.ts so it can be tested directly: a `"use server"` module
 * may only export async functions, and calling the action itself needs Next's
 * request context for revalidatePath().
 */

import type { NewOrderLine } from "@/lib/order-store";
import type { Product } from "@/lib/products";

export type ParseLinesResult =
  | { lines: NewOrderLine[]; error?: undefined }
  | { lines?: undefined; error: string };

/** Kyats are whole numbers — reject decimals rather than silently rounding. */
function parseWholeNumber(raw: FormDataEntryValue | null | undefined) {
  const text = String(raw ?? "")
    .trim()
    .replace(/,/g, "");
  if (text === "") return null;
  if (!/^\d+$/.test(text)) return null;
  const n = Number.parseInt(text, 10);
  return Number.isSafeInteger(n) ? n : null;
}

function parseId(raw: FormDataEntryValue | null | undefined) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Every line must resolve to a catalog product. The stored `name` is read from
 * that product rather than the form, so the snapshot always matches the
 * catalog even if the submission was tampered with.
 *
 * `unitPrice` IS taken from the form — staff can discount a line — but it must
 * be a whole number above zero.
 */
export async function parseOrderLines(
  formData: FormData,
  getProductById: (id: number) => Promise<Product | null>,
): Promise<ParseLinesResult> {
  const productIds = formData.getAll("lineProductId");
  const prices = formData.getAll("lineUnitPrice");
  const quantities = formData.getAll("lineQuantity");

  const lines: NewOrderLine[] = [];
  /** Units asked for per product, to check the sum against stock below. */
  const ordered = new Map<number, { product: Product; quantity: number }>();

  for (let i = 0; i < productIds.length; i += 1) {
    const productId = parseId(productIds[i]);
    const unitPrice = parseWholeNumber(prices[i]);
    const quantity = parseWholeNumber(quantities[i]);

    // A row with nothing picked is just an unused input, not a mistake.
    if (productId === null && unitPrice === null) continue;

    if (productId === null) {
      return { error: `Line ${i + 1} needs a product.` };
    }

    const product = await getProductById(productId);
    if (!product) {
      return { error: `Line ${i + 1} refers to a product that no longer exists.` };
    }
    if (unitPrice === null || unitPrice < 1) {
      return { error: `Line ${i + 1} needs a unit price above 0.` };
    }
    if (quantity === null || quantity < 1) {
      return { error: `Line ${i + 1} needs a quantity of at least 1.` };
    }

    lines.push({
      productId: product.id,
      // Snapshot from the catalog, not from the browser.
      name: product.name,
      unitPrice,
      quantity,
    });

    const running = ordered.get(product.id);
    if (running) running.quantity += quantity;
    else ordered.set(product.id, { product, quantity });
  }

  if (lines.length === 0) {
    return { error: "Add at least one product." };
  }

  // Against the total per product, not each line: the same product can sit on
  // two rows, and each on its own can fit while the sum doesn't.
  for (const { product, quantity } of ordered.values()) {
    if (quantity > product.stock) {
      return {
        error:
          product.stock === 0
            ? `${product.name} is out of stock.`
            : `Only ${product.stock} of ${product.name} in stock, ordering ${quantity}.`,
      };
    }
  }

  return { lines };
}
