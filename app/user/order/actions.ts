"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { updateOrderNote, updateOrderStatus } from "@/lib/order-store";
import { DELIVERY_STATUS, type DeliveryStatus } from "@/lib/orders";

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
}
