"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAbility } from "@/lib/auth";
import { createOrder, OutOfStockError } from "@/lib/order-store";
import { getProduct } from "@/lib/product-store";
import type { OrderWithItems } from "@/lib/orders";

import type { OrderFormState } from "../order-form-state";
import { parseOrderFields } from "../parse-fields";
import { parseOrderLines } from "../parse-lines";
import { formSectionBase } from "@/app/office/[section]/_components/section";

export async function createOrderAction(
  _prevState: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const staff = await requireAbility("writeOrders");

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
    }, staff);
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

  revalidatePath("/office/[section]/order", "page");
  revalidatePath("/office/[section]/dashboard", "page");
  // The order took its units off the shelf, so both the products table and this
  // form's picker are now showing stale counts.
  revalidatePath("/office/[section]/product", "page");
  revalidatePath("/office/[section]/order/new", "page");
  // Same for the edit form's picker, on every order.
  revalidatePath("/office/[section]/order/[slug]/edit", "page");

  redirect(`${formSectionBase(formData)}/order?created=${order.code}&slug=${order.slug}`);
}
