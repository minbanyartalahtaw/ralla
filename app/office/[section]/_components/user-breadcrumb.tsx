"use client";

import { usePathname } from "next/navigation";
import { createContext, use, useEffect, useState, type ReactNode } from "react";

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
  "/user/settings": ["Settings"],
  // Unlinked and URL-only, but it still has to name itself — without a row
  // here the trail falls back to "Dashboard", which would be a lie.
  "/user/theme": ["Theme reference"],
} as const;

/**
 * Detail routes carry a record slug in the path, so they can't be listed above
 * — there is a route per record. The slug is random and never shown, so the
 * page names its record via <RecordCrumb> (the code staff actually read).
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

type RecordLabel = [string | null, (label: string | null) => void];
const RecordContext = createContext<RecordLabel>([null, () => {}]);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  return <RecordContext value={useState<string | null>(null)}>{children}</RecordContext>;
}

/**
 * Rendered by a detail page to name its record in the trail. Only the page has
 * the record — the layout above it sees nothing but a slug.
 */
export function RecordCrumb({ label }: { label: string }) {
  const [, setLabel] = use(RecordContext);
  useEffect(() => {
    setLabel(label);
    return () => setLabel(null);
  }, [label, setLabel]);
  return null;
}

function trailFor(pathname: string, record: string | null): readonly string[] {
  const exact = TRAILS[pathname as keyof typeof TRAILS];
  if (exact) return exact;

  for (const parent of DETAIL_PARENTS) {
    if (!pathname.startsWith(parent.prefix)) continue;
    const [slug, action, ...rest] = pathname
      .slice(parent.prefix.length)
      .split("/");
    // The record itself, optionally one named page under it. Anything deeper
    // isn't ours to name.
    if (!slug || rest.length > 0) continue;
    if (action !== undefined && !DETAIL_ACTIONS[action]) continue;

    // No record crumb until the page names one (first paint, or a 404).
    const trail = record ? [parent.label, record] : [parent.label];
    return action === undefined ? trail : [...trail, DETAIL_ACTIONS[action]];
  }

  return FALLBACK;
}

export function UserBreadcrumb() {
  const pathname = usePathname();
  const [record] = use(RecordContext);
  const trail = trailFor(pathname, record);

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
