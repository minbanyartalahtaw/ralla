"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Explicit trail per route rather than one derived from path segments —
 * `/user/order/new` has no page at `/user/order`, so a segment walk would
 * invent a link that 404s. Add a row here when you add a route.
 */
const TRAILS = {
  "/user/dashboard": [{ label: "Dashboard" }],
  "/user/order": [{ label: "Orders" }],
  "/user/order/new": [{ label: "Orders", href: "/user/order" }, { label: "New order" }],
  "/user/customer": [{ label: "Customers" }],
  "/user/product": [{ label: "Products" }],
  "/user/product/new": [
    { label: "Products", href: "/user/product" },
    { label: "New product" },
  ],
  "/user/customer/new": [
    { label: "Customers", href: "/user/customer" },
    { label: "New customer" },
  ],
} as const;

/**
 * Detail routes carry a record code in the path, so they can't be listed above
 * — there is a route per record. The code itself is the last crumb: it's the
 * same identifier the page shows, so the trail names the record on screen.
 *
 * Add a row here when you add a detail route.
 */
const DETAIL_PARENTS = [
  { prefix: "/user/customer/", label: "Customers", href: "/user/customer" },
  { prefix: "/user/order/", label: "Orders", href: "/user/order" },
] as const;

const FALLBACK = [{ label: "Dashboard", href: "/user/dashboard" }] as const;

type Crumb = { readonly label: string; readonly href?: string };

function trailFor(pathname: string): readonly Crumb[] {
  const exact = TRAILS[pathname as keyof typeof TRAILS];
  if (exact) return exact;

  for (const parent of DETAIL_PARENTS) {
    if (!pathname.startsWith(parent.prefix)) continue;
    const code = pathname.slice(parent.prefix.length);
    // Only a single segment is a record; anything deeper isn't ours to name.
    if (code === "" || code.includes("/")) continue;
    return [
      { label: parent.label, href: parent.href },
      { label: decodeURIComponent(code) },
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
        {trail.map((crumb, i) => (
          <div key={crumb.label} className="flex items-center gap-1.5">
            {i > 0 ? <BreadcrumbSeparator className="mr-1.5" /> : null}
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink render={<Link href={crumb.href} />}>
                  {crumb.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
