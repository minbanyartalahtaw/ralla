"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import {
  setProductActive,
  setProductPrice,
  setProductStock,
} from "@/lib/product-store";
import { parsePrice, parseStock } from "@/lib/products";

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
  await requireSession();
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
  await requireSession();
  const stock = parseStock(String(formData.get("stock") ?? ""));
  if (stock === null) {
    throw new Error("Stock must be a whole number of units, 0 or more.");
  }

  await setProductStock(productId(formData), stock);

  revalidatePath("/user/product");
}

/**
 * Corrects the list price from the products table.
 *
 * Only the catalog price moves. Every order line carries its own `unitPrice`
 * snapshot, so nothing already sold is repriced — see setProductPrice.
 */
export async function setProductPriceAction(formData: FormData) {
  await requireSession();
  const price = parsePrice(String(formData.get("price") ?? ""));
  if (price === null) {
    throw new Error("Price must be a whole number of kyats, at least 1.");
  }

  await setProductPrice(productId(formData), price);

  revalidatePath("/user/product");
  // The order form's picker prints each product's price beside its name.
  revalidatePath("/user/order/new");
}
