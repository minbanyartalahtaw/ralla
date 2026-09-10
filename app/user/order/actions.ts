"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { searchCustomers } from "@/lib/customer-store";
import type { Customer } from "@/lib/customers";
import { updateOrderNote, updateOrderStatus } from "@/lib/order-store";
import { DELIVERY_STATUS, type DeliveryStatus } from "@/lib/orders";

/**
 * Type-ahead lookup for the customer autofill on the order form, used by both
 * the new and edit routes.
 *
 * The session check is load-bearing here rather than defensive: this returns
 * phone numbers and addresses, and a Server Action is callable by direct POST,
 * so without it this is an open customer-data endpoint no matter what the
 * proxy does to `/user/*`.
 */
export async function searchCustomersAction(
  query: string,
): Promise<Customer[]> {
  await requireSession();
  return searchCustomers(query);
}

/**
 * Changes an order's delivery status from the list.
 *
 * Appends to the order's status history rather than only overwriting the
 * current value, so "when did this ship" stays answerable.
 */
export async function updateOrderStatusAction(formData: FormData) {
  await requireSession();
  // NOTE: `changedBy` is still left empty. The session is a shared password
  // and carries no identity, so there is no name to record yet.
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("A valid order id is required.");
  }

  const status = String(formData.get("status") ?? "");
  // Validate against the schema's own values — never trust a posted enum.
  if (!Object.hasOwn(DELIVERY_STATUS, status)) {
    throw new Error(`Unknown delivery status: ${status}`);
  }

  await updateOrderStatus(id, status as DeliveryStatus);

  revalidatePath("/user/order");
  revalidatePath("/user/dashboard");
}

/** Overwrites an order's free-text note from its detail page. */
export async function updateOrderNoteAction(formData: FormData) {
  await requireSession();

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("A valid order id is required.");
  }
  const code = String(formData.get("code") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  await updateOrderNote(id, note);

  revalidatePath(`/user/order/${code}`);
  // The edit form carries this same field. Without this it would still hold
  // the note as it was when that page was last rendered, and saving an
  // unrelated change there would quietly put the old text back.
  revalidatePath("/user/order/[code]/edit", "page");
}
