"use server";

import { revalidatePath } from "next/cache";

import { searchCustomers } from "@/lib/customer-store";
import type { Customer } from "@/lib/customers";
import { createOrder } from "@/lib/order-store";
import {
  CITIES,
  PAYMENT_METHOD,
  type PaymentMethod,
} from "@/lib/orders";
import type { CreateOrderState } from "./state";

/** Kyats are whole numbers — reject decimals rather than silently rounding. */
function parseWholeNumber(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "").trim().replace(/,/g, "");
  if (text === "") return null;
  if (!/^\d+$/.test(text)) return null;
  const n = Number.parseInt(text, 10);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * Type-ahead lookup for the customer autofill on this form.
 *
 * NOTE: admin-only, and it returns phone numbers and addresses. Once auth
 * exists this needs a session check — a Server Action is callable by direct
 * POST, so without one it is an open customer-data endpoint.
 */
export async function searchCustomersAction(
  query: string,
): Promise<Customer[]> {
  return searchCustomers(query);
}

export async function createOrderAction(
  _prevState: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  // NOTE: this is an admin-only route. Once auth exists, check the session
  // here — a Server Action is reachable by direct POST, not just via the form.

  // Present when the form was filled from a saved customer. The detail fields
  // are still read from the form, so an edit made before saving is respected.
  const customerId = String(formData.get("customerId") ?? "").trim();
  const customer = String(formData.get("customer") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const items = String(formData.get("items") ?? "").trim();
  const payment = String(formData.get("payment") ?? "");
  const itemCount = parseWholeNumber(formData.get("itemCount"));
  const total = parseWholeNumber(formData.get("total"));
  const notifyBySms = formData.get("notifyBySms") === "on";

  const errors: Record<string, string> = {};

  if (!customer) errors.customer = "Customer name is required.";
  if (!phone) errors.phone = "Phone number is required.";
  else if (!/^[\d+\s-]{6,20}$/.test(phone))
    errors.phone = "Use digits, spaces or dashes only.";

  if (!city) errors.city = "Pick a city.";
  else if (!CITIES.includes(city as (typeof CITIES)[number]))
    errors.city = "Not a city we deliver to.";

  if (!items) errors.items = "List at least one product.";

  if (itemCount === null) errors.itemCount = "Enter a whole number.";
  else if (itemCount < 1) errors.itemCount = "Must be at least 1.";

  if (total === null) errors.total = "Enter a whole number of kyats.";
  else if (total < 1) errors.total = "Must be greater than 0.";

  if (!Object.hasOwn(PAYMENT_METHOD, payment))
    errors.payment = "Pick a payment method.";

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Check the highlighted fields." };
  }

  const order = await createOrder({
    customerId: customerId || undefined,
    customer,
    phone,
    city,
    address,
    items,
    itemCount: itemCount!,
    total: total!,
    payment: payment as PaymentMethod,
    notifyBySms,
  });

  revalidatePath("/user/order");

  return { errors: {}, createdId: order.id };
}
