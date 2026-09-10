"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import {
  getOrder,
  OutOfStockError,
  updateOrder,
} from "@/lib/order-store";
import { getProduct } from "@/lib/product-store";

import type { OrderFormState } from "../../order-form-state";
import { parseOrderFields } from "../../parse-fields";
import { parseOrderLines } from "../../parse-lines";

function parseId(raw: FormDataEntryValue | null) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Saves an edit to an existing order.
 *
 * The id travels in the form rather than being bound into the action: a Server
 * Action is an ordinary POST either way, so the order is re-read here and the
 * stock arithmetic is settled inside the write transaction.
 */
export async function updateOrderAction(
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  await requireSession();

  const id = parseId(formData.get("orderId"));
  if (id === null) {
    return { errors: {}, message: "That order could not be found." };
  }

  const existing = await getOrder(id);
  if (!existing) {
    return { errors: {}, message: "That order no longer exists." };
  }

  const { fields, errors } = parseOrderFields(formData);

  // What this order already has off the shelf. Without it every line would be
  // measured against a shelf its own units are missing from, and an edit that
  // touched nothing but the address could be refused as overselling.
  const held = new Map<number, number>();
  for (const item of existing.items) {
    if (item.productId === null) continue;
    held.set(item.productId, (held.get(item.productId) ?? 0) + item.quantity);
  }

  const parsed = await parseOrderLines(formData, getProduct, held);
  if (parsed.error) errors.lines = parsed.error;

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Check the highlighted fields." };
  }

  try {
    await updateOrder(id, {
      ...fields,
      // Not from the form. Which customer an order belongs to is settled when
      // it is placed, and a Server Action is an ordinary POST — the edit page
      // doesn't offer to change it, so neither does this.
      customerId: existing.customerId,
      lines: parsed.lines!,
    });
  } catch (error) {
    // The check above ran against the counts this request read; someone else's
    // order can land in between. The transaction is the authority, so its
    // refusal comes back as a form error rather than a crash.
    if (error instanceof OutOfStockError) {
      return {
        errors: { lines: error.message },
        message: "Not enough stock to save this order.",
      };
    }
    throw error;
  }

  revalidatePath(`/user/order/${existing.code}`);
  revalidatePath("/user/order");
  revalidatePath("/user/dashboard");
  // The edit moved units on and off the shelf, so the products table and the
  // new-order picker are both showing stale counts.
  revalidatePath("/user/product");
  revalidatePath("/user/order/new");
  // Same for the edit form's picker, on every order.
  revalidatePath("/user/order/[code]/edit", "page");

  // `?updated=1` is what the detail page toasts on, and it clears itself from
  // the URL once shown — see CreatedToast.
  redirect(`/user/order/${existing.code}?updated=1`);
}
