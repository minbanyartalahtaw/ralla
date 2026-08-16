"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { createCustomer, findCustomerByTiktok } from "@/lib/customer-store";
import {
  isValidTiktokUsername,
  normalizeTiktokUsername,
} from "@/lib/customers";
import { CITIES } from "@/lib/orders";
import type { CreateCustomerState } from "./state";

export async function createCustomerAction(
  _prevState: CreateCustomerState,
  formData: FormData,
): Promise<CreateCustomerState> {
  await requireSession();

  const tiktokRaw = String(formData.get("tiktokUsername") ?? "");
  const tiktokUsername = normalizeTiktokUsername(tiktokRaw);
  const tiktokName = String(formData.get("tiktokName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const errors: Record<string, string> = {};

  if (!tiktokUsername) {
    errors.tiktokUsername = "TikTok username is required.";
  } else if (!isValidTiktokUsername(tiktokUsername)) {
    errors.tiktokUsername =
      "Letters, numbers, underscore and period only, 2–24 characters.";
  } else if (await findCustomerByTiktok(tiktokUsername)) {
    // The handle is the lookup key for order autofill, so it has to be unique.
    errors.tiktokUsername = `@${tiktokUsername} is already saved.`;
  }

  if (!name) errors.name = "Customer name is required.";

  if (!phone) errors.phone = "Phone number is required.";
  else if (!/^[\d+\s-]{6,20}$/.test(phone))
    errors.phone = "Use digits, spaces or dashes only.";

  if (!city) errors.city = "Pick a city.";
  else if (!CITIES.includes(city as (typeof CITIES)[number]))
    errors.city = "Not a city we deliver to.";

  if (!address) errors.address = "Delivery address is required.";

  if (Object.keys(errors).length > 0) {
    return { errors, message: "Check the highlighted fields." };
  }

  await createCustomer({
    tiktokUsername,
    tiktokName,
    name,
    phone,
    city,
    address,
    note,
  });

  revalidatePath("/user/customer");
  redirect("/user/customer");
}
