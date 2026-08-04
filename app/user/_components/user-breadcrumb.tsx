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

const FALLBACK = [{ label: "Dashboard", href: "/user/dashboard" }] as const;

export function UserBreadcrumb() {
  const pathname = usePathname();
  const trail = TRAILS[pathname as keyof typeof TRAILS] ?? FALLBACK;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {trail.map((crumb, i) => (
          <div key={crumb.label} className="flex items-center gap-1.5">
            {i > 0 ? <BreadcrumbSeparator className="mr-1.5" /> : null}
            <BreadcrumbItem>
              {"href" in crumb ? (
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
