"use server";

import { revalidatePath } from "next/cache";

import { setProductActive, setProductStock } from "@/lib/product-store";
import { parseStock } from "@/lib/products";

function productId(formData: FormData): number {
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("A valid product id is required.");
  }
  return id;
}

/**
 * Toggles whether a product can be added to new orders.
 *
 * There is deliberately no delete: order lines carry a `productId`, and
 * removing the product would orphan every past line that referenced it.
 */
export async function toggleProductActiveAction(formData: FormData) {
  // NOTE: admin-only. Needs a session check once auth exists — a Server Action
  // is reachable by direct POST, not just through this form.
  const isActive = formData.get("isActive") === "true";
  await setProductActive(productId(formData), isActive);

  revalidatePath("/user/product");
  // Changes what the order form's picker can offer.
  revalidatePath("/user/order/new");
}

/**
 * Corrects the units on hand from the products table.
 *
 * Takes the counted total rather than a delta — see setProductStock. Rejects
 * anything that isn't a whole count instead of coercing it, so a slipped
 * keystroke can't quietly write a wrong number onto the shelf count.
 */
export async function setProductStockAction(formData: FormData) {
  // NOTE: admin-only. Needs a session check once auth exists.
  const stock = parseStock(String(formData.get("stock") ?? ""));
  if (stock === null) {
    throw new Error("Stock must be a whole number of units, 0 or more.");
  }

  await setProductStock(productId(formData), stock);

  revalidatePath("/user/product");
}
