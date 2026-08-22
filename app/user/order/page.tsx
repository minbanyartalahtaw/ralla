import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Note01Icon,
  PlusSignIcon,
  Search01Icon,
  TruckDeliveryIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { CreatedToast } from "@/components/created-toast";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
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

import { ordersHref } from "./orders-href";
import { Pager } from "./pager";
import { SelectableBody } from "./selectable-body";
import { StatusSelect } from "./status-select";
import { StatusTabs } from "./status-tabs";
import { OrderCards } from "./order-cards";
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
        {/* A plain GET form, so the search lands in the URL: a filtered list
            can be bookmarked, shared, and reloaded, and back returns to the
            previous query. No client JavaScript is involved. */}
        <form method="get" className="min-w-0 flex-1">
          <InputGroup className="max-w-xs">
            <InputGroupAddon>
              {/* Every code starts `RL-`, so typing it is four keystrokes that
                  never narrow anything. Shown, not typed — and
                  normalizeOrderQuery() strips it back off a pasted code. */}
              <InputGroupText className="numeric font-mono">RL-</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              name="q"
              // Keyed on the query so a new one gets a new element. The field
              // is uncontrolled, and Base UI reads `defaultValue` once when it
              // mounts — on an RSC re-render (a status change on this page
              // revalidates it) React would otherwise keep the same input and
              // quietly hand it a default it has already passed the point of
              // being able to use.
              key={query}
              defaultValue={query}
              placeholder=""
              aria-label="Search orders by order ID, without the RL- prefix"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              // The browser's own clear button only empties the field — it
              // never submits, so the list stayed filtered against a box that
              // looked empty. Hidden in favour of the link below, which
              // actually goes somewhere.
              className="numeric font-mono [&::-webkit-search-cancel-button]:appearance-none"
            />
            <InputGroupAddon align="inline-end">
              {searching ? (
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  nativeButton={false}
                  // Keeps the status tab and layout you were on: clearing the
                  // search narrows by one thing less, it doesn't reset
                  // everything.
                  render={<Link href={ordersHref({ status, view })} />}
                  aria-label="Clear search"
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                </InputGroupButton>
              ) : null}
              <InputGroupButton type="submit" size="sm" variant="ghost">
                <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
                Search
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {/* Searching inside a status tab keeps you in it. Without this the
              form would submit `q` alone and quietly drop back to All. */}
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {/* Same reasoning for the layout: searching from the table view
              shouldn't silently land back on cards. */}
          {view === "table" ? (
            <input type="hidden" name="view" value="table" />
          ) : null}
        </form>

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

      <div className="mt-4 rounded-lg border bg-card">
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
                        {o.code}
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
          <div className="p-3">
            <OrderCards orders={orders} />
          </div>
        )}

        {/* Inside the card and below the table, so it reads as the foot of the
            list. Renders nothing at all when everything fits on one page. */}
        <Pager
          page={page}
          pageCount={pageCount}
          query={query}
          status={status}
          view={view}
        />
      </div>
    </div>
  );
}
