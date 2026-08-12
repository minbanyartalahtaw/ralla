"use server";

import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth";
import { createProduct, findProductBySku } from "@/lib/product-store";
import { isValidSku, normalizeSku, parseStock } from "@/lib/products";
import type { CreateProductState } from "./state";

export async function createProductAction(
  _prevState: CreateProductState,
  formData: FormData,
): Promise<CreateProductState> {
  await requireSession();

  const sku = normalizeSku(String(formData.get("sku") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "")
    .trim()
    .replace(/,/g, "");
  const stockRaw = String(formData.get("stock") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  const errors: Record<string, string> = {};

  if (!sku) {
    errors.sku = "SKU is required.";
  } else if (!isValidSku(sku)) {
    errors.sku =
      "Letters, numbers and dashes only, 2–24 characters, starting with a letter or number.";
  } else if (await findProductBySku(sku)) {
    errors.sku = `${sku} is already used by another product.`;
  }

  if (!name) errors.name = "Product name is required.";

  // Kyats are whole numbers — reject decimals rather than silently rounding.
  let price: number | null = null;
  if (priceRaw === "") {
    errors.price = "Price is required.";
  } else if (!/^\d+$/.test(priceRaw)) {
    errors.price = "Whole kyats only, no decimals.";
  } else {
    price = Number.parseInt(priceRaw, 10);
    if (!Number.isSafeInteger(price) || price < 1) {
      errors.price = "Must be greater than 0.";
    }
  }

  // A blank stock field means "none counted yet", not an error — a product can
  // be catalogued before the delivery arrives.
  const stock = stockRaw === "" ? 0 : parseStock(stockRaw);
  if (stock === null) {
    errors.stock = "Whole units only, 0 or more.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Check the highlighted fields." };
  }

  const product = await createProduct({
    sku,
    name,
    price: price!,
    stock: stock!,
    isActive,
  });

  revalidatePath("/user/product");
  // A new active product changes what the order form can pick.
  revalidatePath("/user/order/new");

  return {
    errors: {},
    created: { sku: product.sku, name: product.name },
  };
}
