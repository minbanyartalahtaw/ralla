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

const FALLBACK = ["Dashboard"] as const;

function trailFor(pathname: string): readonly string[] {
  const exact = TRAILS[pathname as keyof typeof TRAILS];
  if (exact) return exact;

  for (const parent of DETAIL_PARENTS) {
    if (!pathname.startsWith(parent.prefix)) continue;
    const code = pathname.slice(parent.prefix.length);
    // Only a single segment is a record; anything deeper isn't ours to name.
    if (code === "" || code.includes("/")) continue;
    return [
      parent.label,
      // Uppercased because codes are stored uppercase and the page prints them
      // that way. URLs come back lowercased often enough that the raw segment
      // would show `rl-260809jbi` in the trail above a sheet reading
      // `RL-260809JBI` — the same record spelled two ways on one screen.
      decodeURIComponent(code).toUpperCase(),
    ];
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
