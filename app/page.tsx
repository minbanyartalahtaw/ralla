import { redirect } from "next/navigation";

/**
 * There is no landing page. RALLA is an internal admin with no public face, so
 * the root is just the way in — the dashboard for signed-in staff, and proxy.ts
 * turns that into `/login` for anyone else.
 *
 * The style guide that used to live here is at `/user/theme`, unlinked.
 */
export default function RootPage() {
  redirect("/user/dashboard");
}
