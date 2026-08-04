"use server";

import { revalidatePath } from "next/cache";

import { searchCustomers } from "@/lib/customer-store";
import type { Customer } from "@/lib/customers";
import { createOrder } from "@/lib/order-store";
import { getProduct } from "@/lib/product-store";
import { CITIES, PAYMENT_METHOD, type PaymentMethod } from "@/lib/orders";
import { parseOrderLines } from "./parse-lines";
import type { CreateOrderState } from "./state";

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

function parseId(raw: FormDataEntryValue | null) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export async function createOrderAction(
  _prevState: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  // NOTE: this is an admin-only route. Once auth exists, check the session
  // here — a Server Action is reachable by direct POST, not just via the form.

  // Present when the form was filled from a saved customer. The detail fields
  // are still read from the form, so an edit made before saving is respected.
  const customerId = parseId(formData.get("customerId"));
  const customer = String(formData.get("customer") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const payment = String(formData.get("payment") ?? "");
  const notifyBySms = formData.get("notifyBySms") === "on";

  const errors: Record<string, string> = {};

  if (!customer) errors.customer = "Customer name is required.";

  if (!phone) errors.phone = "Phone number is required.";
  else if (!/^[\d+\s-]{6,20}$/.test(phone))
    errors.phone = "Use digits, spaces or dashes only.";

  if (!city) errors.city = "Pick a city.";
  else if (!CITIES.includes(city as (typeof CITIES)[number]))
    errors.city = "Not a city we deliver to.";

  if (!Object.hasOwn(PAYMENT_METHOD, payment))
    errors.payment = "Pick a payment method.";

  const parsed = await parseOrderLines(formData, getProduct);
  if (parsed.error) errors.lines = parsed.error;

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Check the highlighted fields." };
  }

  const order = await createOrder({
    customerId,
    customerName: customer,
    phone,
    city,
    address,
    paymentMethod: payment as PaymentMethod,
    notifyBySms,
    lines: parsed.lines!,
  });

  revalidatePath("/user/order");
  revalidatePath("/user/dashboard");

  return { errors: {}, createdId: order.code };
}
