import { redirect } from "next/navigation";

import { getCurrentStaff } from "@/lib/auth";
import { homePathFor } from "@/lib/permissions";

/**
 * There is no landing page. RALLA is an internal admin with no public face, so
 * the root is just the way in — each role's home for signed-in staff, and the
 * login form for anyone else.
 *
 * The style guide that used to live here is at `/office/admin/theme`, unlinked.
 */
export default async function RootPage() {
  const staff = await getCurrentStaff();
  redirect(staff ? homePathFor(staff.role) : "/login");
}
