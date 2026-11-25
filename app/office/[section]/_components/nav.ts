import {
  Calendar03Icon,
  DashboardSquare01Icon,
  Delete02Icon,
  Package02Icon,
  PlusSignIcon,
  UserGroupIcon,
  UserSettings01Icon,
} from "@hugeicons/core-free-icons";

import type { Role } from "@/lib/permissions";

export type NavItem = {
  label: string;
  href: string;
  icon: typeof PlusSignIcon;
  /** A "+" shortcut beside the item, for a route opened more to create than browse. */
  newHref?: string;
  newLabel?: string;
};

/** `collapsible` groups start folded; the label opens them. */
export type NavGroup = {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
};

const ADMIN: NavGroup = {
  label: "Admin",
  items: [
    {
      label: "Dashboard",
      href: "/office/admin/dashboard",
      icon: DashboardSquare01Icon,
    },
    {
      label: "Orders",
      href: "/office/admin/order",
      icon: Calendar03Icon,
      newHref: "/office/admin/order/new",
      newLabel: "New order",
    },
    { label: "Products", href: "/office/admin/product", icon: Package02Icon },
    { label: "Customers", href: "/office/admin/customer", icon: UserGroupIcon },
    {
      label: "Deleted orders",
      href: "/office/admin/order/deleted",
      icon: Delete02Icon,
    },
    {
      label: "Manage Staff",
      href: "/office/admin/staff",
      icon: UserSettings01Icon,
    },
  ],
};

const STAFF: NavGroup = {
  label: "Staff",
  items: [
    { label: "New order", href: "/office/staff/order/new", icon: PlusSignIcon },
    { label: "Orders", href: "/office/staff/order", icon: Calendar03Icon },
    { label: "Products", href: "/office/staff/product", icon: Package02Icon },
    { label: "Customers", href: "/office/staff/customer", icon: UserGroupIcon },
  ],
};

/**
 * The sidebar's groups for a role. Built on the server and handed to the
 * sidebar as data, so a staff member's page never carries the Admin group —
 * not in the HTML, not in the client bundle. An admin gets both, with the
 * Staff group folded so it stays out of the way but the staff screens are
 * one click away.
 */
export function navFor(role: Role): NavGroup[] {
  return role === "admin" ? [ADMIN, { ...STAFF, collapsible: true }] : [STAFF];
}
