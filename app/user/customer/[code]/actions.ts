"use server";

import { revalidatePath } from "next/cache";

import { parseAvatarId } from "@/lib/avatar";
import { requireSession } from "@/lib/auth";
import {
  findCustomerByTiktok,
  getCustomer,
  updateCustomer,
  updateCustomerAvatar,
} from "@/lib/customer-store";
import {
  isValidTiktokUsername,
  normalizeTiktokUsername,
} from "@/lib/customers";
import { CITIES } from "@/lib/orders";
import type { UpdateCustomerState } from "./state";

/**
 * Saves the Details card on a customer's own page.
 *
 * Same field rules as customer/new/actions.ts, with one addition: the
 * TikTok-handle uniqueness check has to exclude this customer's own row, or
 * saving the form unchanged would fail by colliding with itself.
 *
 * Never touches a past order — Order snapshots `customer`, `phone`, `city`
 * and `address` at the time it was placed, so a house move here can't
 * silently rewrite where last month's parcel was delivered.
 */
export async function updateCustomerAction(
  formData: FormData,
): Promise<UpdateCustomerState> {
  await requireSession();

  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isSafeInteger(id) || id < 1) {
    return { errors: {}, message: "A valid customer id is required.", ok: false };
  }
  const customer = await getCustomer(id);
  if (!customer) {
    return { errors: {}, message: "Customer not found.", ok: false };
  }

  const tiktokUsername = normalizeTiktokUsername(
    String(formData.get("tiktokUsername") ?? ""),
  );
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
  } else {
    const existing = await findCustomerByTiktok(tiktokUsername);
    if (existing && existing.id !== id) {
      errors.tiktokUsername = `@${tiktokUsername} is already saved.`;
    }
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
    return { errors, message: "Check the highlighted fields.", ok: false };
  }

  await updateCustomer(id, {
    tiktokUsername,
    tiktokName,
    name,
    phone,
    city,
    address,
    note,
  });

  revalidatePath(`/user/customer/${customer.code}`);
  // The customer list shows name and handle; the order form's search reads
  // the table fresh on every keystroke, so it needs nothing revalidated.
  revalidatePath("/user/customer");

  return { errors: {}, ok: true };
}

/**
 * Sets or clears the avatar picker's chosen catalogue id. Split out from
 * updateCustomerAction because the picker isn't part of the Details form —
 * it saves the moment one is picked, not on a form submit.
 *
 * The id is checked against the catalogue rather than just length-limited: it
 * carries the customer's tier, so an unrecognised value would render as the
 * initials monogram and silently lose that meaning.
 */
export async function updateCustomerAvatarAction(
  id: number,
  avatar: string | null,
): Promise<{ ok: boolean; message?: string }> {
  await requireSession();

  if (avatar !== null && !parseAvatarId(avatar)) {
    return { ok: false, message: "Unknown avatar." };
  }

  const customer = await getCustomer(id);
  if (!customer) {
    return { ok: false, message: "Customer not found." };
  }

  await updateCustomerAvatar(id, avatar);

  revalidatePath(`/user/customer/${customer.code}`);
  revalidatePath("/user/customer");

  return { ok: true };
}
