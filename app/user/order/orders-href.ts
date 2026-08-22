import type { DeliveryStatus } from "@/lib/orders";

export type OrdersView = {
  query?: string;
  status?: DeliveryStatus;
  page?: number;
  /** `table` for the table layout; omitted (or `card`) means cards, the default. */
  view?: "card" | "table";
};

/**
 * Builds a URL for the orders list. Every link that changes what is shown goes
 * through here, so the search, the status tab and the page number survive each
 * other — changing one must never silently drop the other two.
 *
 * Omitting `page` is how a caller says "back to the first page", which is what
 * the status tabs want: page 4 of *all* orders is meaningless once the list is
 * narrowed to the three that are pending. Page 1 is left out of the query
 * string entirely so the default view has a clean URL.
 */
export function ordersHref({ query, status, page, view }: OrdersView): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  if (page && page > 1) params.set("page", String(page));
  // Cards are the default, so `view=card` is left out of the URL for the same
  // clean-URL reason as page 1 above.
  if (view === "table") params.set("view", "table");

  const qs = params.toString();
  return qs ? `/user/order?${qs}` : "/user/order";
}
