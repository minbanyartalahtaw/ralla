"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { createOrder, OutOfStockError } from "@/lib/order-store";
import { getProduct } from "@/lib/product-store";
import type { OrderWithItems } from "@/lib/orders";

import type { OrderFormState } from "../order-form-state";
import { parseOrderFields } from "../parse-fields";
import { parseOrderLines } from "../parse-lines";

export async function createOrderAction(
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  await requireSession();

  const { fields, errors } = parseOrderFields(formData);
  const notifyBySms = formData.get("notifyBySms") === "on";

  const parsed = await parseOrderLines(formData, getProduct);
  if (parsed.error) errors.lines = parsed.error;

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Check the highlighted fields." };
  }

  let order: OrderWithItems;
  try {
    order = await createOrder({
      ...fields,
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
  // Same for the edit form's picker, on every order.
  revalidatePath("/user/order/[code]/edit", "page");

  redirect(`/user/order?created=${order.code}`);
}
