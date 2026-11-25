"use server";

import { revalidatePath } from "next/cache";

import { requireAbility } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH, hashPassword } from "@/lib/password";
import {
  LastAdminError,
  createStaff,
  getStaff,
  normalizeUsername,
  setStaffActive,
  setStaffRole,
  updateStaffPassword,
} from "@/lib/staff-store";

import type { StaffFormState } from "./state";

const MAX_NAME_LENGTH = 80;
const USERNAME = /^[a-z0-9._-]{3,32}$/;

/** The account a row action is about. Never the person acting — that's the session. */
async function target(formData: FormData) {
  const id = Number.parseInt(String(formData.get("id") ?? ""), 10);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  return getStaff(id);
}

function done(ok: string): StaffFormState {
  revalidatePath("/office/[section]/staff", "page");
  return { errors: {}, ok };
}

export async function createStaffAction(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  await requireAbility("manageStaff");

  const name = String(formData.get("name") ?? "").trim();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "staff";

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Name is required.";
  else if (name.length > MAX_NAME_LENGTH)
    errors.name = `Keep it under ${MAX_NAME_LENGTH} characters.`;
  if (!USERNAME.test(username))
    errors.username = "3–32 characters: letters, digits, dot, dash or underscore.";
  if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (Object.keys(errors).length > 0) return { errors };

  try {
    await createStaff({ name, username, password, role });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { errors: { username: `"${username}" is already taken.` } };
    }
    throw error;
  }
  return done(`Created ${name} (${username}).`);
}

/** Sets a new password the admin typed. That person is signed out everywhere. */
export async function resetStaffPasswordAction(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const me = await requireAbility("manageStaff");
  const staff = await target(formData);
  if (!staff) return { errors: {}, message: "That account no longer exists." };
  // Here it would sign the admin out of this very browser; Settings re-issues
  // the cookie and asks for the current password.
  if (staff.id === me.id)
    return { errors: {}, message: "Change your own password in Settings." };

  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH)
    return { errors: {}, message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` };

  await updateStaffPassword(staff.id, await hashPassword(password));
  return done(`New password set for ${staff.name}. They are signed out everywhere.`);
}

export async function setStaffActiveAction(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const me = await requireAbility("manageStaff");
  const staff = await target(formData);
  if (!staff) return { errors: {}, message: "That account no longer exists." };

  const active = formData.get("active") === "true";
  if (staff.id === me.id && !active)
    return { errors: {}, message: "You can't turn off your own account." };

  try {
    await setStaffActive(staff.id, active);
  } catch (error) {
    if (error instanceof LastAdminError) return { errors: {}, message: error.message };
    throw error;
  }
  return done(active ? `${staff.name} can sign in again.` : `${staff.name} is turned off.`);
}

export async function setStaffRoleAction(
  _prevState: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const me = await requireAbility("manageStaff");
  const staff = await target(formData);
  if (!staff) return { errors: {}, message: "That account no longer exists." };

  const role = formData.get("role") === "admin" ? "admin" : "staff";
  if (staff.id === me.id && role !== "admin")
    return { errors: {}, message: "You can't remove your own admin role." };

  try {
    await setStaffRole(staff.id, role);
  } catch (error) {
    if (error instanceof LastAdminError) return { errors: {}, message: error.message };
    throw error;
  }
  return done(`${staff.name} is now ${role === "admin" ? "an admin" : "staff"}.`);
}
