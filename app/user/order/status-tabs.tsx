import Link from "next/link";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DELIVERY_STATUS,
  DELIVERY_STATUS_KEYS,
  type DeliveryStatus,
} from "@/lib/orders";

import { ordersHref, type OrdersView } from "./orders-href";

/**
 * Delivery-status filter for the orders list.
 *
 * Each trigger is rendered as a real `<a>` (via Base UI's `render` prop, same
 * polymorphism the rest of the app uses for a `Button`-as-`Link`), not a
 * client-side value switch: the filter belongs in the URL beside `?q=`, so a
 * filtered list is bookmarkable and the back button steps through what was
 * actually looked at. There's no `TabsContent` — the "panel" is the orders
 * list below, which the server re-renders from the URL, so `Tabs` here is
 * only borrowed for its segmented-control chrome and keyboard nav.
 *
 * Each tab carries its count. The number is the point of the tab — "Pending 3"
 * answers "is there anything to pack" without opening it, which is the question
 * this page is usually opened to answer.
 */
export function StatusTabs({
  active,
  counts,
  query,
  view,
}: {
  active?: DeliveryStatus;
  counts: Record<DeliveryStatus, number>;
  query: string;
  view?: OrdersView["view"];
}) {
  // No `page` — switching tabs always returns to the first page, since the page
  // you were on describes a list that no longer exists. The search and layout
  // are carried through, because they narrow/present the same list rather
  // than replacing it.
  const href = (status?: DeliveryStatus) => ordersHref({ query, status, view });

  const total = DELIVERY_STATUS_KEYS.reduce((n, s) => n + counts[s], 0);

  return (
    // Six tabs don't fit across a phone; scrolling the strip keeps them on one
    // line rather than wrapping into a second row that pushes the table down.
    // The bar itself is hidden — under a row of tabs it reads as a stray
    // underline, and the tabs running off the edge already say "there's more".
    <Tabs
      value={active ?? "all"}
      className="no-scrollbar -mx-1 overflow-x-auto px-1"
    >
      <TabsList className="h-auto w-max bg-transparent p-0">
        <TabsTrigger
          value="all"
          nativeButton={false}
          render={<Link href={href()} />}
          className="gap-1.5 border data-active:border-primary/40 data-active:bg-primary/10 dark:data-active:border-primary/40 dark:data-active:bg-primary/10"
        >
          All
          <span className="numeric text-[11px] opacity-70">{total}</span>
        </TabsTrigger>

        {DELIVERY_STATUS_KEYS.map((s) => (
          <TabsTrigger
            key={s}
            value={s}
            nativeButton={false}
            render={<Link href={href(s)} />}
            className="gap-1.5 border data-active:border-primary/40 data-active:bg-primary/10 dark:data-active:border-primary/40 dark:data-active:bg-primary/10"
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
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
