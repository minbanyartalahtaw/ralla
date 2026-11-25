"use server";

import { revalidatePath } from "next/cache";

import { createSession, requireSession } from "@/lib/auth";
import {
  MIN_PASSWORD_LENGTH,
  hashPassword,
  verifyPassword,
} from "@/lib/password";
import { updateStaffName, updateStaffPassword } from "@/lib/staff-store";
import type { SettingsFormState } from "./state";

const MAX_NAME_LENGTH = 80;

/**
 * Both actions edit the signed-in person's own row. The id comes from the
 * session, never the form — a posted id would let anyone rename anyone.
 */
export async function updateNameAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const staff = await requireSession();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { errors: { name: "Name is required." } };
  if (name.length > MAX_NAME_LENGTH)
    return { errors: { name: `Keep it under ${MAX_NAME_LENGTH} characters.` } };

  await updateStaffName(staff.id, name);
  // The sidebar footer is rendered by the /user layout.
  revalidatePath("/user", "layout");
  return { errors: {}, ok: true };
}

export async function changePasswordAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const staff = await requireSession();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const errors: Record<string, string> = {};
  if (!current) errors.current = "Enter your current password.";
  if (next.length < MIN_PASSWORD_LENGTH)
    errors.next = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (next === current)
    errors.next = "Pick a password different from the current one.";
  if (confirm !== next) errors.confirm = "Doesn't match the new password.";
  if (Object.keys(errors).length > 0) return { errors };

  if (!(await verifyPassword(current, staff.passwordHash))) {
    return { errors: { current: "Current password isn't right." } };
  }

  const updated = await updateStaffPassword(staff.id, await hashPassword(next));
  // The session fingerprints the password hash, so every cookie issued under
  // the old one stops working on its next request — other devices are signed
  // out. Re-issue this browser's cookie so the person making the change isn't.
  await createSession(updated);
  return { errors: {}, ok: true };
}
