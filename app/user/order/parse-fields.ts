/**
 * Reads and validates the order form's non-line fields.
 *
 * Shared by the new and edit routes so the two can't drift into disagreeing
 * about what a valid order looks like, and kept out of their action modules for
 * the same reason as parseOrderLines(): a `"use server"` module may only export
 * async functions.
 */

import { CITIES, PAYMENT_METHOD, type PaymentMethod } from "@/lib/orders";

export type OrderFields = {
  /** Set only when the form was filled from a saved customer. */
  customerId: number | null;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  paymentMethod: PaymentMethod;
  note: string;
};

function parseId(raw: FormDataEntryValue | null) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function parseOrderFields(formData: FormData): {
  fields: OrderFields;
  errors: Record<string, string>;
} {
  // The detail fields are read from the form even when a customer is linked, so
  // an edit made before saving is respected: the customer record is the default
  // used to fill an order, not the source of truth for one.
  const customerId = parseId(formData.get("customerId"));
  const customerName = String(formData.get("customer") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const payment = String(formData.get("payment") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const errors: Record<string, string> = {};

  if (!customerName) errors.customer = "Customer name is required.";

  if (!phone) errors.phone = "Phone number is required.";
  else if (!/^[\d+\s-]{6,20}$/.test(phone))
    errors.phone = "Use digits, spaces or dashes only.";

  if (!city) errors.city = "Pick a city.";
  else if (!CITIES.includes(city as (typeof CITIES)[number]))
    errors.city = "Not a city we deliver to.";

  if (!Object.hasOwn(PAYMENT_METHOD, payment))
    errors.payment = "Pick a payment method.";

  return {
    fields: {
      customerId,
      customerName,
      phone,
      city,
      address,
      paymentMethod: payment as PaymentMethod,
      note,
    },
    errors,
  };
}
