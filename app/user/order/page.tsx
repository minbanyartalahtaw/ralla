import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Note01Icon,
  PlusSignIcon,
  Search01Icon,
  TruckDeliveryIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { CreatedToast } from "@/components/created-toast";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  countOrdersByStatus,
  listOrdersPage,
  normalizeOrderQuery,
} from "@/lib/order-store";

import { Pager } from "./pager";
import { SelectableBody } from "./selectable-body";
import { StatusSelect } from "./status-select";
import { StatusTabs } from "./status-tabs";
import { OrderCards } from "./order-cards";
import { OrderCode } from "./order-code";
import { OrderSearch } from "./order-search";
import { ViewSwitch } from "./view-switch";
import {
  DELIVERY_STATUS,
  PAYMENT_METHOD,
  formatDate,
  formatKyat,
  itemCount,
  parseDeliveryStatus,
} from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders — RALLA",
};

const th = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

export default async function OrdersPage({
  searchParams,
}: PageProps<"/user/order">) {
  const { q, status: rawStatus, page: rawPage, created, view: rawView } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const createdCode = typeof created === "string" ? created : undefined;
  const status = parseDeliveryStatus(
    typeof rawStatus === "string" ? rawStatus : undefined,
  );
  // Cards are the default; only `?view=table` selects the table.
  const view = rawView === "table" ? "table" : "card";
  // A junk page — `?page=abc`, `?page=-3` — reads as the first page rather than
  // an error. listOrdersPage() clamps the upper end against the real count.
  const requestedPage = Number.parseInt(String(rawPage ?? "1"), 10);

  // The counts deliberately ignore `status` — they describe what each tab
  // holds, so they have to be taken across all of them under the same search.
  const [{ orders, page, pageCount }, counts] = await Promise.all([
    listOrdersPage({ query, status }, requestedPage),
    countOrdersByStatus({ query }),
  ]);

  // Three kinds of empty, and they need different words: a shop with no orders
  // at all wants "add one", a search that found nothing wants "clear it", and
  // an empty status tab is usually good news.
  const searched = normalizeOrderQuery(query);
  const searching = searched !== "";
  const filtering = status !== undefined;

  // The table and the empty state are single slabs and need the frame to hold
  // their edges. The cards are slabs themselves — a frame around them boxes a
  // grid of boxes, so in card view the list draws nothing and the cards float
  // straight on the page background.
  const framed = orders.length === 0 || view === "table";

  return (
    <div>
      {/* The visible heading is gone — the breadcrumb already names the page.
          This keeps the document with a top-level heading for screen readers
          and the tab order, which a page with no h1 at all would lose. */}
      <h1 className="sr-only">Orders</h1>

      <CreatedToast
        code={createdCode}
        message={createdCode ? `Order ${createdCode} created.` : ""}
        detailHref={createdCode ? `/user/order/${createdCode}` : undefined}
      />

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {/* Live, but the query still lands in the URL: a filtered list can
              be bookmarked, shared and reloaded, and back returns to the
              previous query. */}
          <OrderSearch query={query} status={status} view={view} />
        </div>

        <Button nativeButton={false} render={<Link href="/user/order/new" />}>
          <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
          New order
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <StatusTabs active={status} counts={counts} query={query} view={view} />
        </div>
        <ViewSwitch query={query} status={status} page={page} view={view} />
      </div>

      <div className={framed ? "mt-4 rounded-lg border bg-card" : "mt-4"}>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="text-muted-foreground">
              <HugeiconsIcon
                icon={searching ? Search01Icon : TruckDeliveryIcon}
                size={32}
                strokeWidth={1.5}
              />
            </span>
            {searching ? (
              <>
                <p className="mt-3 text-xs font-medium">No order matches</p>
                {/* Echoed back with the prefix that wasn't typed, so it reads
                    as the code that was actually looked for. */}
                <p className="numeric mt-1 font-mono text-xs text-muted-foreground">
                  RL-{searched}
                </p>
                {/* A search that finds nothing inside a tab may well match
                    outside it, and that is the likelier mistake of the two. */}
                {filtering ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    in {DELIVERY_STATUS[status].label.toLowerCase()} orders
                  </p>
                ) : null}
              </>
            ) : filtering ? (
              <>
                <p className="mt-3 text-xs font-medium">
                  Nothing {DELIVERY_STATUS[status].label.toLowerCase()}
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  {DELIVERY_STATUS[status].description}
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-xs font-medium">No orders yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Orders you save will appear here, newest first.
                </p>
                <Button
                  variant="outline"
                  nativeButton={false}
                  className="mt-4"
                  render={<Link href="/user/order/new" />}
                >
                  Add an order
                </Button>
              </>
            )}
          </div>
        ) : view === "table" ? (

          <Table className="min-w-[1240px]">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className={th}>Order</TableHead>
                <TableHead className={th}>Customer</TableHead>
                <TableHead className={th}>Phone</TableHead>
                <TableHead className={th}>City</TableHead>
                <TableHead className={th}>Items</TableHead>
                <TableHead className={`${th} text-right`}>Total</TableHead>
                <TableHead className={th}>Payment</TableHead>
                <TableHead className={th}>Date</TableHead>
                <TableHead className={th}>Delivery</TableHead>
                <TableHead className={th}>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <SelectableBody>
              {orders.map((o) => (
                <TableRow
                  key={o.id}
                  // Berry rather than the default grey, so a marked row is
                  // clearly *chosen* and not just the one under the cursor —
                  // hover is grey and the two would otherwise look alike.
                  className="data-[state=selected]:bg-primary/10"
                >
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="numeric font-mono text-[11px] font-medium">
                        <OrderCode code={o.code} query={query} />
                      </span>
                      {/* A hover-only hint rather than its own column — most
                          orders have no note, so widening every row for the
                          few that do would be waste. */}
                      {o.note ? (
                        <HugeiconsIcon
                          icon={Note01Icon}
                          size={12}
                          strokeWidth={2}
                          className="shrink-0 text-muted-foreground"
                          aria-label={`Note: ${o.note}`}
                        >
                          <title>{o.note}</title>
                        </HugeiconsIcon>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{o.customerName}</TableCell>
                  <TableCell className="numeric text-muted-foreground">
                    {o.phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.city}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <div
                      className="truncate text-muted-foreground"
                      title={o.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                    >
                      {o.items.map((i) => i.name).join(", ")}
                    </div>
                    <div className="numeric text-[11px] text-muted-foreground">
                      {itemCount(o.items)} items
                    </div>
                  </TableCell>
                  <TableCell className="numeric text-right font-medium">
                    {formatKyat(o.total)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        o.paymentMethod === "refunded"
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {PAYMENT_METHOD[o.paymentMethod]}
                    </span>
                  </TableCell>
                                    <TableCell className="numeric text-muted-foreground">
                    {formatDate(o.placedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusSelect orderId={o.id} code={o.code} status={o.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Addressed by `code`, not `id`: the code is what's on
                        screen, so a copied link reads as the row it came from. */}
                    <Button
                      variant="ghost"
                      size="xs"
                      nativeButton={false}
                      render={<Link href={`/user/order/${o.code}`} />}
                      aria-label={`View details for order ${o.code}`}
                    >
                      View details
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        data-icon="inline-end"
                      />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </SelectableBody>
          </Table>
        ) : (
          <OrderCards orders={orders} query={query} />
        )}

        {/* Inside the card and below the table, so it reads as the foot of the
            list. Renders nothing at all when everything fits on one page. */}
        <Pager
          page={page}
          pageCount={pageCount}
          query={query}
          status={status}
          view={view}
          flush={!framed}
        />
      </div>
    </div>
  );
}
