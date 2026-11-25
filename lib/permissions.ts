/**
 * Who may do what — the one place the role rules live (docs/role.md, section 2).
 *
 * This answers the question; `requireAbility()` in `lib/auth.ts` is what
 * enforces it. Hiding a button with `can()` is a courtesy, never the security.
 * Imports nothing server-only, so the sidebar can use it too.
 */

import type { Staff } from "@/lib/staff-store";

export type Role = Staff["role"];

const ALL_ABILITIES = [
  "viewDashboard",
  "manageProducts",
  "manageCustomers",
  "createCustomer",
  "manageStaff",
  "writeOrders",
  "deleteOrders",
  "viewDeletedOrders",
  "restoreOrders",
  "viewTheme",
] as const;

export type Ability = (typeof ALL_ABILITIES)[number];

const ROLE_ABILITIES: Record<Role, readonly Ability[]> = {
  admin: ALL_ABILITIES,
  staff: ["writeOrders", "deleteOrders", "createCustomer"],
};

export function can(staff: { role: Role }, ability: Ability): boolean {
  return ROLE_ABILITIES[staff.role].includes(ability);
}

/** Where each role lands after sign-in, and where it's sent when refused. */
export function homePathFor(role: Role): string {
  return role === "admin" ? "/office/admin/dashboard" : "/office/staff/order/new";
}

/**
 * The app lives under `/office/[section]`, where the section is one of these.
 * Both render the same pages; the admin section is admin-only, and pages only
 * an admin may use refuse the staff section. The URL is never the security —
 * every page and action still checks the role itself.
 */
export const SECTIONS = ["admin", "staff"] as const;
export type Section = (typeof SECTIONS)[number];

export function parseSection(raw: unknown): Section | null {
  return SECTIONS.find((s) => s === raw) ?? null;
}

/** `/office/admin` or `/office/staff` — prefix every in-app link with this. */
export function sectionBase(section: Section): string {
  return `/office/${section}`;
}
