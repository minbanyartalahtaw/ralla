"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import {
  findProductBySku,
  setProductActive,
  setProductName,
  setProductPrice,
  setProductSku,
  setProductStock,
} from "@/lib/product-store";
import { isValidSku, normalizeSku, parsePrice, parseStock } from "@/lib/products";

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
 * Renames a product's SKU from the products table.
 *
 * Unlike setProductStockAction and setProductPriceAction, invalid input here
 * is *expected* — a mistyped SKU or a collision with another product's SKU
 * are everyday mistakes, not edge cases. Server Actions redact thrown error
 * messages in production (see node_modules/next/dist/docs/.../error.md), so
 * this returns the message as data instead of throwing, the same way
 * createProductAction reports validation errors.
 */
export async function setProductSkuAction(
  formData: FormData,
): Promise<{ error?: string }> {
  await requireSession();
  const id = productId(formData);
  const sku = normalizeSku(String(formData.get("sku") ?? ""));

  if (!isValidSku(sku)) {
    return {
      error:
        "Letters, numbers and dashes only, 2–24 characters, starting with a letter or number.",
    };
  }

  const existing = await findProductBySku(sku);
  if (existing && existing.id !== id) {
    return { error: `${sku} is already used by another product.` };
  }

  await setProductSku(id, sku);

  // The SKU isn't shown on the order form's picker, unlike name and price.
  revalidatePath("/user/product");
  return {};
}

/** Renames a product from the products table. */
export async function setProductNameAction(
  formData: FormData,
): Promise<{ error?: string }> {
  await requireSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Product name is required." };
  }

  await setProductName(productId(formData), name);

  revalidatePath("/user/product");
  // The order form's picker labels each product by name.
  revalidatePath("/user/order/new");
  return {};
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
