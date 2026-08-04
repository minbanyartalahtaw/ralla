"use server";

import { revalidatePath } from "next/cache";

import { setProductActive } from "@/lib/product-store";

/**
 * Toggles whether a product can be added to new orders.
 *
 * There is deliberately no delete: order lines carry a `productId`, and
 * removing the product would orphan every past line that referenced it.
 */
export async function toggleProductActiveAction(formData: FormData) {
  // NOTE: admin-only. Needs a session check once auth exists — a Server Action
  // is reachable by direct POST, not just through this form.
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("A valid product id is required.");
  }

  const isActive = formData.get("isActive") === "true";
  await setProductActive(id, isActive);

  revalidatePath("/user/product");
  // Changes what the order form's picker can offer.
  revalidatePath("/user/order/new");
}
