import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { getOrderByCode } from "@/lib/order-store";
import { getCustomer } from "@/lib/customer-store";
import {
  DELIVERY_STATUS,
  PAYMENT_METHOD,
  formatDateTime,
  formatKyat,
  itemCount,
  lineTotal,
  type DeliveryStatus,
} from "@/lib/orders";

import { BackButton } from "@/components/back-button";
import { OrderNote } from "./order-note";



/**
 * `generateMetadata` and the page body both need the order, and both run on the
 * same request — cache() makes that one query rather than two.
 */
const loadOrder = cache(getOrderByCode);

export async function generateMetadata({
  params,
}: PageProps<"/user/order/[code]">): Promise<Metadata> {
  const { code } = await params;
  const order = await loadOrder(code);

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
const sheetBody = "text-[13px] sm:text-sm";

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
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <dt className={label}>{title}</dt>
      <dd className={`${sheetBody} font-medium`}>{children}</dd>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: PageProps<"/user/order/[code]">) {
  const { code } = await params;
  const order = await loadOrder(code);
  if (!order) notFound();

  // Only to link back to the customer's page. Everything printed on the sheet
  // is the order's own snapshot — a walk-in has no record to link to at all.
  const customer = order.customerId ? await getCustomer(order.customerId) : null;
  const events = order.statusEvents;

  return (
    <div className="mx-auto max-w-[640px]">
      {/* App chrome. Sits outside the sheet and out of the print stylesheet, so
          neither a crop nor a PDF picks it up. */}
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback="/user/order" />
      </div>

      <article
        data-print-sheet
        className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]"
      >
        <header className="flex items-start justify-between gap-4 px-5 py-5 sm:px-8 sm:py-6">
          <div>
            <p className="text-[15px] font-bold tracking-[0.32em] text-primary uppercase">
              RALLA
            </p>
            <p className="mt-1 text-[11px] leading-none tracking-wide text-muted-foreground">
              Beauty & Cosmetics
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Invoice
            </p>
            <h1 className="numeric mt-1 font-mono text-[13px] font-semibold tracking-wide text-foreground">
              {order.code}
            </h1>
          </div>
        </header>

        <div className="h-px bg-border" aria-hidden />

        <div className="px-5 py-5 sm:px-8 sm:py-6">
          <div className="grid gap-5 sm:grid-cols-[1.1fr_0.9fr] sm:gap-8">
            <div>
              <p className={label}>Billed to</p>
              {/* The snapshot, not the customer's current record — this is
                  where the parcel was actually addressed. */}
              <address className={`mt-2.5 leading-relaxed not-italic ${sheetBody}`}>
                {customer ? (
                  <Link
                    href={`/user/customer/${customer.code}`}
                    className="font-semibold text-foreground decoration-border underline-offset-2 hover:underline"
                  >
                    {order.customerName}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground">{order.customerName}</span>
                )}
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
            <dl className="rounded-xl bg-muted/50 px-4 py-3 sm:rounded-none sm:bg-transparent sm:p-0 sm:self-start">
              <MetaRow title="Date">
                <span className="numeric text-foreground">{formatDateTime(order.placedAt)}</span>
              </MetaRow>
              <div className="my-1 h-px bg-border/60 sm:hidden" aria-hidden />
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
              <div className="my-1 h-px bg-border/60 sm:hidden" aria-hidden />
              <MetaRow title="Status">
                <StatusChip status={order.status} />
              </MetaRow>
            </dl>
          </div>

          {/* ── Items ─────────────────────────────────────────────── */}
          {/* Desktop: real table with generous gutters and tabular nums */}
          <table className={`mt-6 hidden w-full sm:table ${sheetBody}`}>
            <thead>
              <tr className="border-b border-border">
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
              {/* Names and prices as they were at time of sale — the line's own
                  snapshot, not today's catalog entry. */}
              {order.items.map((item) => (
                <tr key={item.id} className="group">
                  <td className="py-3 pr-4 font-medium text-foreground">{item.name}</td>
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
          <div className={`mt-6 sm:hidden ${sheetBody}`}>
            <p className={`${label} pb-2`}>Items · {itemCount(order.items)}</p>
            <div className="divide-y divide-border/70 overflow-hidden rounded-xl border">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 bg-card px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{item.name}</p>
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
            <div className="flex w-full items-center justify-between gap-4 rounded-xl bg-muted/40 px-4 py-3 sm:max-w-[19rem] sm:rounded-none sm:bg-transparent sm:px-0 sm:py-0 sm:border-t sm:border-border sm:pt-4">
              <div>
                <p className={label}>Total</p>
                <p className="numeric mt-0.5 text-xs text-muted-foreground">
                  {itemCount(order.items)} {itemCount(order.items) === 1 ? "item" : "items"}
                </p>
              </div>
              <p className="numeric text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                {formatKyat(order.total)}
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground/80">
            Thank you for shopping with RALLA
          </p>
        </div>
      </article>

      {/* Outside the sheet on purpose: an internal note has no business on
          something that gets screenshotted to a customer. */}
      <section className="mt-8">
        <h2 className={label}>Note</h2>
        <div className="mt-3 rounded-lg border bg-card px-5 py-4">
          <OrderNote orderId={order.id} code={order.code} note={order.note} />
        </div>
      </section>

      {/* Outside the sheet on purpose: when the order moved is an internal
          record, so it stays off both the print and a crop of the invoice.
          Newest first, so the current status is the one staff see without
          scrolling. */}
      <section className="mt-8">
        <h2 className={label}>Order history</h2>
        <div className="mt-3 rounded-lg border bg-card px-5 py-4">
          {events.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No status changes recorded.
            </p>
          ) : (
            <ol className="space-y-3.5 border-l pl-5">
              {events.map((event, i) => {
                const current = i === 0;
                return (
                  <li key={event.id} className="relative">
                    {/* The dot sits on the connector line; ring-card punches
                        it through. */}
                    <span
                      className={`absolute top-1 -left-6 size-2 rounded-full ring-4 ring-card ${DELIVERY_STATUS[event.status].dot}`}
                      aria-hidden
                    />
                    <p
                      className={`text-xs ${current ? "font-medium" : "text-muted-foreground"}`}
                    >
                      {DELIVERY_STATUS[event.status].label}
                    </p>
                    <p className="numeric text-[11px] text-muted-foreground">
                      {formatDateTime(event.changedAt)}
                    </p>
                    {event.note ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {event.note}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}
