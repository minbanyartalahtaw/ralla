import Link from "next/link";

import {
  DELIVERY_STATUS,
  DELIVERY_STATUS_KEYS,
  type DeliveryStatus,
} from "@/lib/orders";

import { ordersHref } from "./orders-href";

/**
 * Delivery-status filter for the orders list.
 *
 * Plain links, not a select or a client-side toggle: the filter belongs in the
 * URL beside `?q=`, so a filtered list is bookmarkable and the back button
 * steps through what was actually looked at. That also keeps the whole page a
 * Server Component.
 *
 * Each tab carries its count. The number is the point of the tab — "Pending 3"
 * answers "is there anything to pack" without opening it, which is the question
 * this page is usually opened to answer.
 */
export function StatusTabs({
  active,
  counts,
  query,
}: {
  active?: DeliveryStatus;
  counts: Record<DeliveryStatus, number>;
  query: string;
}) {
  // No `page` — switching tabs always returns to the first page, since the page
  // you were on describes a list that no longer exists. The search is carried
  // through, because the two narrow the same list rather than replacing it.
  const href = (status?: DeliveryStatus) => ordersHref({ query, status });

  const total = DELIVERY_STATUS_KEYS.reduce((n, s) => n + counts[s], 0);

  const tab =
    "flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors";
  const on = "border-primary/40 bg-primary/10 font-medium text-foreground";
  const off = "border-transparent text-muted-foreground hover:bg-muted";

  return (
    // Six tabs don't fit across a phone; scrolling the strip keeps them on one
    // line rather than wrapping into a second row that pushes the table down.
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      <Link
        href={href()}
        aria-current={active ? undefined : "page"}
        className={`${tab} ${active ? off : on}`}
      >
        All
        <span className="numeric text-[11px] opacity-70">{total}</span>
      </Link>

      {DELIVERY_STATUS_KEYS.map((s) => (
        <Link
          key={s}
          href={href(s)}
          aria-current={active === s ? "page" : undefined}
          className={`${tab} ${active === s ? on : off}`}
        >
          {/* Same dot as the chip in the row below, so the tab and the status
              it filters to are visibly the same thing. Never hue alone — the
              label is always beside it. */}
          <span
            className={`size-1.5 shrink-0 rounded-full ${DELIVERY_STATUS[s].dot}`}
            aria-hidden
          />
          {DELIVERY_STATUS[s].label}
          <span className="numeric text-[11px] opacity-70">{counts[s]}</span>
        </Link>
      ))}
    </div>
  );
}
