"use client";

import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Explicit trail per route rather than one derived from path segments —
 * `/user/order/new` has no page at `/user/order`, so a segment walk would
 * invent a crumb for a route that 404s. Add a row here when you add a route.
 *
 * Nothing here is a link. The trail says where you are, not how to leave: the
 * way back is the BackButton on the page itself. `BreadcrumbPage` already
 * carries `aria-disabled`, so assistive tech is told the same thing the cursor
 * is — there is nothing to click.
 */
const TRAILS = {
  "/user/dashboard": ["Dashboard"],
  "/user/order": ["Orders"],
  "/user/order/new": ["Orders", "New order"],
  "/user/customer": ["Customers"],
  "/user/customer/new": ["Customers", "New customer"],
  "/user/product": ["Products"],
  "/user/product/new": ["Products", "New product"],
  // Unlinked and URL-only, but it still has to name itself — without a row
  // here the trail falls back to "Dashboard", which would be a lie.
  "/user/theme": ["Theme reference"],
} as const;

/**
 * Detail routes carry a record code in the path, so they can't be listed above
 * — there is a route per record. The code itself is the last crumb: it's the
 * same identifier the page shows, so the trail names the record on screen.
 *
 * Add a row here when you add a detail route.
 */
const DETAIL_PARENTS = [
  { prefix: "/user/customer/", label: "Customers" },
  { prefix: "/user/order/", label: "Orders" },
] as const;

/**
 * Pages that hang off a record rather than being one — `/user/order/RL-…/edit`.
 * Named here so the trail stays three deep instead of falling through to the
 * "Dashboard" fallback, which would put a crumb on screen for a page nobody is
 * on. Add a row when you add a sub-route.
 */
const DETAIL_ACTIONS: Record<string, string> = {
  edit: "Edit",
};

const FALLBACK = ["Dashboard"] as const;

function trailFor(pathname: string): readonly string[] {
  const exact = TRAILS[pathname as keyof typeof TRAILS];
  if (exact) return exact;

  for (const parent of DETAIL_PARENTS) {
    if (!pathname.startsWith(parent.prefix)) continue;
    const [code, action, ...rest] = pathname
      .slice(parent.prefix.length)
      .split("/");
    // The record itself, optionally one named page under it. Anything deeper
    // isn't ours to name.
    if (!code || rest.length > 0) continue;
    if (action !== undefined && !DETAIL_ACTIONS[action]) continue;

    const trail = [
      parent.label,
      // Uppercased because codes are stored uppercase and the page prints them
      // that way. URLs come back lowercased often enough that the raw segment
      // would show `rl-260809jbi` in the trail above a sheet reading
      // `RL-260809JBI` — the same record spelled two ways on one screen.
      decodeURIComponent(code).toUpperCase(),
    ];
    return action === undefined ? trail : [...trail, DETAIL_ACTIONS[action]];
  }

  return FALLBACK;
}

export function UserBreadcrumb() {
  const pathname = usePathname();
  const trail = trailFor(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {trail.map((label, i) => {
          const last = i === trail.length - 1;
          return (
            <div key={label} className="flex items-center gap-1.5">
              {i > 0 ? <BreadcrumbSeparator className="mr-1.5" /> : null}
              <BreadcrumbItem>
                {/* Only the page you're on gets the foreground colour; the
                    section above it stays muted, so the trail still reads as a
                    hierarchy without either half looking clickable. */}
                {last ? <BreadcrumbPage>{label}</BreadcrumbPage> : <span>{label}</span>}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
