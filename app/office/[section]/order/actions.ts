"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAbility } from "@/lib/auth";
import { searchCustomers } from "@/lib/customer-store";
import type { Customer } from "@/lib/customers";
import {
  restoreOrder,
  softDeleteOrder,
  updateOrderNote,
  updateOrderStatus,
} from "@/lib/order-store";
import { DELIVERY_STATUS, type DeliveryStatus } from "@/lib/orders";
import { formSectionBase } from "@/app/office/[section]/_components/section";

/**
 * Type-ahead lookup for the customer autofill on the order form, used by both
 * the new and edit routes.
 *
 * The session check is load-bearing here rather than defensive: this returns
 * phone numbers and addresses, and a Server Action is callable by direct POST,
 * so without it this is an open customer-data endpoint no matter what the
 * proxy does to `/office/*`.
 */
export async function searchCustomersAction(
  query: string,
): Promise<Customer[]> {
  await requireAbility("writeOrders");
  return searchCustomers(query);
}

/**
 * Changes an order's delivery status from the list.
 *
 * Appends to the order's status history rather than only overwriting the
 * current value, so "when did this ship" stays answerable.
 */
export async function updateOrderStatusAction(formData: FormData) {
  const staff = await requireAbility("writeOrders");
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("A valid order id is required.");
  }

  const status = String(formData.get("status") ?? "");
  // Validate against the schema's own values — never trust a posted enum.
  if (!Object.hasOwn(DELIVERY_STATUS, status)) {
    throw new Error(`Unknown delivery status: ${status}`);
  }

  await updateOrderStatus(id, status as DeliveryStatus, staff);

  revalidatePath("/office/[section]/order", "page");
  revalidatePath("/office/[section]/dashboard", "page");
}

/** Overwrites an order's free-text note from its detail page. */
export async function updateOrderNoteAction(formData: FormData) {
  const staff = await requireAbility("writeOrders");

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("A valid order id is required.");
  }
  const note = String(formData.get("note") ?? "").trim();

  await updateOrderNote(id, note, staff);

  revalidatePath("/office/[section]/order/[slug]", "page");
  // The edit form carries this same field. Without this it would still hold
  // the note as it was when that page was last rendered, and saving an
  // unrelated change there would quietly put the old text back.
  revalidatePath("/office/[section]/order/[slug]/edit", "page");
}

function orderId(formData: FormData): number {
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("A valid order id is required.");
  }
  return id;
}

/** Every page that lists, counts or totals orders. */
function revalidateOrderLists() {
  revalidatePath("/office/[section]/order", "page");
  revalidatePath("/office/[section]/order/deleted", "page");
  revalidatePath("/office/[section]/dashboard", "page");
  revalidatePath("/office/[section]/customer/[slug]", "page");
}

/** Soft-deletes an order from its detail page. Both roles; stock is untouched. */
export async function deleteOrderAction(formData: FormData) {
  const staff = await requireAbility("deleteOrders");
  const order = await softDeleteOrder(orderId(formData), staff);
  revalidateOrderLists();
  redirect(`${formSectionBase(formData)}/order?deleted=${order.code}`);
}

/** Brings a deleted order back, from the admin's Deleted orders list. */
export async function restoreOrderAction(formData: FormData) {
  const staff = await requireAbility("restoreOrders");
  await restoreOrder(orderId(formData), staff);
  revalidateOrderLists();
}
