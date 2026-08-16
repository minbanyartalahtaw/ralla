"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { searchCustomers } from "@/lib/customer-store";
import type { Customer } from "@/lib/customers";
import { createOrder, OutOfStockError } from "@/lib/order-store";
import { getProduct } from "@/lib/product-store";
import { CITIES, PAYMENT_METHOD, type PaymentMethod } from "@/lib/orders";
import { parseOrderLines } from "./parse-lines";
import type { CreateOrderState } from "./state";

/**
 * Type-ahead lookup for the customer autofill on this form.
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

function parseId(raw: FormDataEntryValue | null) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export async function createOrderAction(
  _prevState: CreateOrderState,
  formData: FormData,
): Promise<CreateOrderState> {
  await requireSession();

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

  try {
    await createOrder({
      customerId,
      customerName: customer,
      phone,
      city,
      address,
      paymentMethod: payment as PaymentMethod,
      notifyBySms,
      lines: parsed.lines!,
    });
  } catch (error) {
    // The stock check above ran against the counts this request read; someone
    // else's order can land in between. The transaction is the authority, so
    // its refusal comes back as a form error rather than a crash.
    if (error instanceof OutOfStockError) {
      return {
        errors: { lines: error.message },
        message: "Not enough stock to save this order.",
      };
    }
    throw error;
  }

  revalidatePath("/user/order");
  revalidatePath("/user/dashboard");
  // The order took its units off the shelf, so both the products table and this
  // form's picker are now showing stale counts.
  revalidatePath("/user/product");
  revalidatePath("/user/order/new");

  redirect("/user/order");
}
