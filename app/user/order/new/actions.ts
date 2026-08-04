"use server";

import { revalidatePath } from "next/cache";

import { searchCustomers } from "@/lib/customer-store";
import type { Customer } from "@/lib/customers";
import { createOrder, type NewOrderLine } from "@/lib/order-store";
import { CITIES, PAYMENT_METHOD, type PaymentMethod } from "@/lib/orders";
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

/** Kyats are whole numbers — reject decimals rather than silently rounding. */
function parseWholeNumber(raw: FormDataEntryValue | null) {
  const text = String(raw ?? "")
    .trim()
    .replace(/,/g, "");
  if (text === "") return null;
  if (!/^\d+$/.test(text)) return null;
  const n = Number.parseInt(text, 10);
  return Number.isSafeInteger(n) ? n : null;
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

  // ── Order lines ──
  // Parsed from parallel arrays. Never trust a client-sent total: it's
  // recomputed from these on the server, in createOrder().
  const names = formData.getAll("lineName").map((v) => String(v).trim());
  const productIds = formData.getAll("lineProductId");
  const prices = formData.getAll("lineUnitPrice");
  const quantities = formData.getAll("lineQuantity");

  const lines: NewOrderLine[] = [];
  let lineError: string | undefined;

  for (let i = 0; i < names.length; i += 1) {
    const name = names[i];
    const unitPrice = parseWholeNumber(prices[i] ?? null);
    const quantity = parseWholeNumber(quantities[i] ?? null);

    // A completely blank row is just an unused input, not a mistake.
    const untouched = !name && unitPrice === null && (quantity ?? 1) === 1;
    if (untouched) continue;

    if (!name) {
      lineError = `Line ${i + 1} needs an item name.`;
      break;
    }
    if (unitPrice === null || unitPrice < 1) {
      lineError = `Line ${i + 1} needs a unit price above 0.`;
      break;
    }
    if (quantity === null || quantity < 1) {
      lineError = `Line ${i + 1} needs a quantity of at least 1.`;
      break;
    }

    lines.push({
      productId: parseId(productIds[i] ?? null),
      name,
      unitPrice,
      quantity,
    });
  }

  if (!lineError && lines.length === 0) {
    lineError = "Add at least one item.";
  }
  if (lineError) errors.lines = lineError;

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
    lines,
  });

  revalidatePath("/user/order");
  revalidatePath("/user/dashboard");

  return { errors: {}, createdId: order.code };
}
