import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { cache } from "react";
import type { Metadata } from "next";
import { getOrderBySlug, listOrderChanges } from "@/lib/order-store";
import { getCustomer } from "@/lib/customer-store";
import { RecordCrumb } from "@/app/office/[section]/_components/user-breadcrumb";
import { requireAbility } from "@/lib/auth";
import { can } from "@/lib/permissions";
import {
  DELIVERY_STATUS,
  PAYMENT_METHOD,
  formatDateTime,
  formatKyat,
  itemCount,
  lineTotal,
  type DeliveryStatus,
  type OrderChange,
} from "@/lib/orders";

import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { CreatedToast } from "@/components/created-toast";
import { RallaMark, RallaWordmark } from "@/components/ralla-logo";
import { DeleteOrder } from "./delete-order";
import { DownloadInvoice } from "./download-invoice";
import { OrderNote } from "./order-note";
import { getSection } from "@/app/office/[section]/_components/section";



/**
 * `generateMetadata` and the page body both need the order, and both run on the
 * same request — cache() makes that one query rather than two.
 */
const loadOrder = cache(getOrderBySlug);

export async function generateMetadata({
  params,
}: PageProps<"/office/[section]/order/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const order = await loadOrder(slug);

  return {
    title: order ? `${order.code} — RALLA` : "Order not found — RALLA",
  };
}

const label = "text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase";

/**
 * Sheet text runs a step larger than the rest of the app. The app is read at
 * arm's length on a desktop; this sheet is read as a screenshot forwarded to a
 * customer's phone, where 11px of address is a squint.
 */
const sheetBody = "text-[13px] @xl:text-sm";

/**
 * The read-only twin of the orders table's StatusSelect. Deliberately not
 * clickable: this is a record of what happened, and the action behind that chip
 * revalidates the orders list, not this route.
 */
function StatusChip({ status }: { status: DeliveryStatus }) {
  const s = DELIVERY_STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${s.chip}`}
    >
      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

function MetaRow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  // Neither half wraps. A date broken after its day, or a payment method broken
  // after "Cash on", collides with the row under it and reads as a rendering
  // fault on something a customer is being handed.
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <dt className={`${label} whitespace-nowrap`}>{title}</dt>
      <dd className={`${sheetBody} font-medium whitespace-nowrap`}>{children}</dd>
    </div>
  );
}

const CHANGE_LABEL: Record<OrderChange["action"], string> = {
  created: "created the order",
  updated: "edited",
  status: "changed the status",
  note: "changed the note",
  deleted: "deleted the order",
  restored: "restored the order",
};

const FIELD_LABEL: Record<string, string> = {
  customer: "Customer",
  phone: "Phone",
  city: "City",
  address: "Address",
  payment: "Payment",
  note: "Note",
  items: "Items",
  total: "Total",
  status: "Status",
};

/** One readable line per changed field: `Address: Old street → New street`. */
function changeText(change: OrderChange) {
  const value = (v: string) =>
    change.field === "status" && v in DELIVERY_STATUS
      ? DELIVERY_STATUS[v as DeliveryStatus].label
      : v || "(empty)";
  if (change.field === "items" && !change.oldValue) return `Added ${change.newValue}`;
  if (change.field === "items" && !change.newValue) return `Removed ${change.oldValue}`;
  const name = FIELD_LABEL[change.field] ?? change.field;
  return `${name}: ${value(change.oldValue)} → ${value(change.newValue)}`;
}

type HistoryEntry = {
  key: string;
  who: string;
  what: string;
  lines: string[];
  at: Date;
  /** Status-moving entries take the status's traffic-light dot. */
  status?: DeliveryStatus;
};

/**
 * One timeline from the change log plus the status events it doesn't cover.
 *
 * One save writes one row per changed field, all with the same person and
 * timestamp — shown as one entry with a line per field. Since tracking began,
 * every status event is written in the same transaction as a `created` or
 * `status` change row, so it shares that row's timestamp exactly; an event
 * with no such twin is from before tracking and is shown on its own.
 */
function historyEntries(
  changes: OrderChange[],
  events: { id: number; status: DeliveryStatus; note: string; changedBy: string; changedAt: Date }[],
): HistoryEntry[] {
  const entries: (HistoryEntry & { change: OrderChange })[] = [];
  for (const change of changes) {
    const last = entries.at(-1)?.change;
    const line = change.field ? [changeText(change)] : [];
    if (
      last &&
      last.action === change.action &&
      last.staffName === change.staffName &&
      last.changedAt.getTime() === change.changedAt.getTime()
    ) {
      // Rows arrive newest first; put each save's lines back in the order written.
      entries.at(-1)!.lines.unshift(...line);
    } else {
      entries.push({
        change,
        key: `c${change.id}`,
        who: change.staffName,
        what: CHANGE_LABEL[change.action],
        lines: line,
        at: change.changedAt,
        status:
          change.action === "created"
            ? "pending"
            : change.action === "status" && change.newValue in DELIVERY_STATUS
              ? (change.newValue as DeliveryStatus)
              : undefined,
      });
    }
  }

  const tracked = new Set(
    changes
      .filter((c) => c.action === "created" || c.action === "status")
      .map((c) => c.changedAt.getTime()),
  );
  const legacy: HistoryEntry[] = events
    .filter((e) => !tracked.has(e.changedAt.getTime()))
    .map((e) => ({
      key: `e${e.id}`,
      // "system" marks an older order's first event; "" is an unnamed change.
      who: e.changedBy === "system" ? "" : e.changedBy,
      what:
        e.changedBy === "system"
          ? "Order created"
          : e.changedBy
            ? "changed the status"
            : "Status changed",
      lines: [`Status: ${DELIVERY_STATUS[e.status].label}`, ...(e.note ? [e.note] : [])],
      at: e.changedAt,
      status: e.status,
    }));

  return [...entries, ...legacy].sort((x, y) => y.at.getTime() - x.at.getTime());
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: PageProps<"/office/[section]/order/[slug]">) {
  const staff = await requireAbility("writeOrders");
  const { base } = await getSection(params);
  const { slug } = await params;
  const order = await loadOrder(slug);
  if (!order) notFound();
  const changes = await listOrderChanges(order.id);

  // Set by the edit form's redirect, which lands back here rather than on a
  // list — so the toast is the only thing that says the save went through.
  const { updated } = await searchParams;

  // Only to link back to the customer's page. Everything printed on the sheet
  // is the order's own snapshot — a walk-in has no record to link to at all.
  const customer = order.customerId ? await getCustomer(order.customerId) : null;
  const events = order.statusEvents;
  const history = historyEntries(changes, events);

  return (
    <div className="mx-auto max-w-[640px]">
      <RecordCrumb label={order.code} />
      {/* No `detailHref` — this *is* the detail page. The order code is the
          dedupe key, so returning here after a second edit toasts again. */}
      <CreatedToast
        code={updated ? order.code : undefined}
        message={`Order ${order.code} updated.`}
      />

      {/* App chrome. Sits outside the sheet and out of the print stylesheet, so
          neither a crop nor a PDF picks it up. */}
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback={`${base}/order`} />
        <div className="flex items-center gap-2">
          {/* Straight to the same numbered form the order was placed on, so
              correcting one is the page staff already know rather than a
              second layout to learn. Delivery status isn't on it — that moves
              from the orders list, which records when it moved. */}
          <Button
            variant="secondary"
            nativeButton={false}
            render={<Link href={`${base}/order/${order.slug}/edit`} />}
          >
            <HugeiconsIcon icon={PencilEdit02Icon} data-icon="inline-start" />
            Edit
          </Button>
          <DownloadInvoice code={order.code} />
        </div>
      </div>

      {/* `@container` rather than the viewport breakpoints this sheet used to
          use. The two layouts below — the item table and the stacked cards —
          now switch on how wide the *sheet* is, not how wide the screen is,
          which is what lets the exported image be the desktop invoice even
          when it's a phone doing the exporting: the export lays a copy of this
          out at a fixed width, and a container query re-evaluates for it where
          a media query never would. It also stops the table from being drawn
          cramped when a wide window leaves the sheet narrow. */}
      <article
        data-print-sheet
        className="@container mt-3 overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
      >
        <header className="flex items-center justify-between gap-4 bg-brand-cream px-5 py-5 text-foreground/70 @xl:px-8 @xl:py-6">
          <div className="flex min-w-0 items-center gap-3">
            <RallaMark className="size-12 text-brand-coral" />
            <div className="min-w-0">
              <RallaWordmark className="h-5 w-auto text-brand-coral" />
              <p className="mt-1.5 text-[11px] leading-none tracking-wide whitespace-nowrap">
                Beauty & Cosmetics
              </p>
            </div>
          </div>
          {/* The letterhead is a fixed pair of short strings — it should take
              the room it needs and let the name give way, never break "RL-"
              onto its own line. */}
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold tracking-[0.16em] uppercase">
              Invoice
            </p>
            <h1 className="numeric mt-1 font-mono text-[13px] font-semibold tracking-wide whitespace-nowrap text-foreground">
              {order.code}
            </h1>
          </div>
        </header>

        <div className="px-5 py-5 @xl:px-8 @xl:py-6">
          {/* `auto` for the meta, the rest to the address — not the two
              fractions this used to split. Burmese has no spaces, so a city
              like မန္တလေးတိုင်းဒေသကြီး is one unbreakable run, and under `fr`
              its min-content dragged the address column wide enough to starve
              the meta beside it into wrapping every value. `minmax(0,1fr)`
              refuses it that pull; `overflow-wrap: anywhere` on the address
              itself is what lets the run break instead. */}
          <div className="grid gap-5 @xl:grid-cols-[minmax(0,1fr)_auto] @xl:gap-8">
            <div className="min-w-0">
              <p className={label}>Billed to</p>
              {/* The snapshot, not the customer's current record — this is
                  where the parcel was actually addressed. */}
              <address
                className={`mt-2.5 leading-relaxed not-italic [overflow-wrap:anywhere] ${sheetBody}`}
              >
                {/* Baseline-aligned so the code sits with the name rather than
                    with its cap-height, and wrapping so a long name pushes it
                    to its own line instead of squeezing itself. */}
                <div className="flex flex-wrap items-baseline gap-x-2">
                  {customer ? (
                    <Link
                      href={`${base}/customer/${customer.slug}`}
                      className="font-semibold text-foreground decoration-border underline-offset-2 hover:underline"
                    >
                      {order.customerName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-foreground">{order.customerName}</span>
                  )}
                  {/* The customer's own record, not this order's. A walk-in has
                      none — the snapshot above is all there is of them. */}
                  {customer ? (
                    <span className="numeric font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                      {customer.code}
                    </span>
                  ) : null}
                </div>
                <div className="numeric mt-1 text-muted-foreground">
                  {order.phone}
                </div>
                <div className="mt-0.5 leading-snug text-muted-foreground">
                  {order.address ? <span>{order.address}, </span> : null}
                  <span>{order.city}</span>
                </div>
              </address>
            </div>

            {/* On mobile this reads as a soft card — a screenshot needs the
                meta to be effortlessly scannable without hunting across a
                full-width table. On desktop it breathes as plain space. */}
            <dl className="rounded-xl bg-muted/50 px-4 py-3 @xl:min-w-52 @xl:rounded-none @xl:bg-transparent @xl:p-0 @xl:self-start">
              <MetaRow title="Date">
                <span className="numeric text-foreground">{formatDateTime(order.placedAt)}</span>
              </MetaRow>
              <div className="my-1 h-px bg-border/60 @xl:hidden" aria-hidden />
              <MetaRow title="Payment">
                <span
                  className={
                    order.paymentMethod === "refunded"
                      ? "text-destructive"
                      : "text-foreground"
                  }
                >
                  {PAYMENT_METHOD[order.paymentMethod]}
                </span>
              </MetaRow>
              {/* Delivery status is an internal fact. Staff read it here, but
                  the exported image is the customer's copy — it tells them
                  nothing they can act on, and a "pending" chip on a parcel
                  they have already been told is on its way only invites the
                  question. `data-invoice-hide` takes it, and its divider, out
                  of the capture; it stays on screen. */}
              <div data-invoice-hide>
                <div className="my-1 h-px bg-border/60 @xl:hidden" aria-hidden />
                <MetaRow title="Status">
                  <StatusChip status={order.status} />
                </MetaRow>
              </div>
            </dl>
          </div>

          {/* ── Items ─────────────────────────────────────────────── */}
          {/* Desktop: real table with generous gutters and tabular nums */}
          <table className={`mt-6 hidden w-full @xl:table ${sheetBody}`}>
            <thead>
              <tr className="border-b border-brand-coral/50">
                <th scope="col" className={`${label} pb-2.5 text-left`}>
                  Item
                </th>
                <th scope="col" className={`${label} pb-2.5 pl-4 text-center`}>
                  Qty
                </th>
                <th scope="col" className={`${label} pb-2.5 pl-6 text-right`}>
                  Unit price
                </th>
                <th scope="col" className={`${label} pb-2.5 pl-6 text-right`}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {/* Names, SKUs and prices as they were at time of sale — the
                  line's own snapshot, not today's catalog entry. */}
              {order.items.map((item) => (
                <tr key={item.id} className="group">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {item.name}
                    {/* Under the name rather than in its own column: it belongs
                        to the item, and a fifth column would squeeze the three
                        numeric ones that have to stay readable down a column.
                        Empty only for lines written before the snapshot
                        existed, or whose product was already deleted. */}
                    {item.sku ? (
                      <span className="numeric mt-0.5 block font-mono text-[11px] font-normal text-muted-foreground">
                        {item.sku}
                      </span>
                    ) : null}
                  </td>
                  <td className="numeric py-3 pl-4 text-center text-muted-foreground">
                    {item.quantity}
                  </td>
                  <td className="numeric py-3 pl-6 text-right text-muted-foreground">
                    {formatKyat(item.unitPrice)}
                  </td>
                  <td className="numeric py-3 pl-6 text-right font-semibold text-foreground">
                    {formatKyat(lineTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: stacked cards — no horizontal scroll, no squinting */}
          <div className={`mt-6 @xl:hidden ${sheetBody}`}>
            <p className={`${label} pb-2`}>Items · {itemCount(order.items)}</p>
            <div className="divide-y divide-border/70 overflow-hidden rounded-xl border">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 bg-card px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
                    {item.sku ? (
                      <p className="numeric mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        {item.sku}
                      </p>
                    ) : null}
                    <p className="numeric mt-1 text-xs text-muted-foreground">
                      {item.quantity} × {formatKyat(item.unitPrice)}
                    </p>
                  </div>
                  <p className="numeric shrink-0 pt-0.5 text-sm font-semibold text-foreground">
                    {formatKyat(lineTotal(item))}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Total ─────────────────────────────────────────────── */}
          <div className="mt-5 flex justify-end">
            <div className="flex w-full items-center justify-between gap-4 rounded-xl bg-brand-cream px-4 py-3 @xl:max-w-[19rem] @xl:px-5 @xl:py-4">
              <div>
                <p className={label}>Total</p>
                <p className="numeric mt-0.5 text-xs text-muted-foreground">
                  {itemCount(order.items)} {itemCount(order.items) === 1 ? "item" : "items"}
                </p>
              </div>
              <p className="numeric text-xl font-bold tracking-tight text-foreground @xl:text-2xl">
                {formatKyat(order.total)}
              </p>
            </div>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <RallaMark small className="size-4 text-brand-coral" />
            Thank you for shopping with RALLA
          </p>
        </div>
        <div className="h-1.5 bg-brand-coral" aria-hidden />
      </article>

      {/* Outside the sheet on purpose: an internal note has no business on
          something that gets screenshotted to a customer. */}
      <section className="mt-8">
        <h2 className={label}>Note</h2>
        <div className="mt-3 rounded-lg border bg-card px-5 py-4">
          <OrderNote orderId={order.id} note={order.note} />
        </div>
      </section>

      {/* Outside the sheet on purpose: who changed what, and when the order
          moved, is an internal record — it stays off both the print and a
          crop of the invoice. Newest first. Orders from before the log
          existed have no "created" row, so that line says so instead. */}
      <section className="mt-8">
        <h2 className={label}>History</h2>
        <div className="mt-3 rounded-lg border bg-card px-5 py-4">
          <ol className="space-y-3.5 border-l pl-5">
            {history.map(({ key, who, what, lines, at, status }) => (
              <li key={key} className="relative">
                {/* The dot sits on the connector line; ring-card punches it
                    through. Status moves wear their traffic-light colour. */}
                <span
                  className={`absolute top-1 -left-6 size-2 rounded-full ring-4 ring-card ${status ? DELIVERY_STATUS[status].dot : "bg-muted-foreground/40"}`}
                  aria-hidden
                />
                <p className="text-xs">
                  {who ? <span className="font-medium">{who} </span> : null}
                  <span className={who ? "text-muted-foreground" : "font-medium"}>
                    {what}
                  </span>
                </p>
                {lines.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-[11px] [overflow-wrap:anywhere] text-muted-foreground">
                    {lines.map((line, j) => (
                      <li key={j}>{line}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="numeric mt-0.5 text-[11px] text-muted-foreground">
                  {formatDateTime(at)}
                </p>
              </li>
            ))}
            {changes.some((c) => c.action === "created") || events.length > 0 ? null : (
              <li className="relative">
                <span
                  className="absolute top-1 -left-6 size-2 rounded-full bg-muted-foreground/40 ring-4 ring-card"
                  aria-hidden
                />
                <p className="text-xs text-muted-foreground">Created — before tracking</p>
              </li>
            )}
          </ol>
        </div>
      </section>

      {can(staff, "deleteOrders") ? (
        <section className="mt-8">
          <h2 className={label}>Danger zone</h2>
          <div className="mt-3">
            <DeleteOrder orderId={order.id} code={order.code} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
