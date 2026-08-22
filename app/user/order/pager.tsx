import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import type { DeliveryStatus } from "@/lib/orders";

import { ordersHref, type OrdersView } from "./orders-href";

/**
 * Previous / Next for the orders list, with the range it is showing.
 *
 * Links rather than buttons, so the page number lives in the URL: an order
 * opened from page 3 comes back to page 3, and the list can be shared as seen.
 * That also keeps this a Server Component.
 *
 * At the ends the link becomes a plain disabled button — rendering a `<Link>`
 * to the page you are already on would look clickable and do nothing.
 */
export function Pager({
  page,
  pageCount,
  query,
  status,
  view,
}: {
  page: number;
  pageCount: number;
  query: string;
  status?: DeliveryStatus;
  view?: OrdersView["view"];
}) {
  // One page of results needs no controls; "Page 1 of 1" is noise.
  if (pageCount <= 1) return null;

  const step = (to: number, label: string, icon: typeof ArrowLeft01Icon, back = false) => {
    const disabled = back ? page <= 1 : page >= pageCount;
    const arrow = (
      <HugeiconsIcon
        icon={icon}
        data-icon={back ? "inline-start" : "inline-end"}
      />
    );

    if (disabled) {
      return (
        <Button variant="outline" size="sm" disabled>
          {back ? arrow : null}
          {label}
          {back ? null : arrow}
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={ordersHref({ query, status, page: to, view })} />}
      >
        {back ? arrow : null}
        {label}
        {back ? null : arrow}
      </Button>
    );
  };

  return (
    <nav
      aria-label="Orders pages"
      className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3"
    >
      {/* One readout, not two — the row range said the same thing. */}
      <p className="numeric text-[11px] text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      <div className="flex items-center gap-2">
        {step(page - 1, "Previous", ArrowLeft01Icon, true)}
        {step(page + 1, "Next", ArrowRight01Icon)}
      </div>
    </nav>
  );
}
