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

const label = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

/**
 * The read-only twin of the orders table's StatusSelect. Deliberately not
 * clickable: this is a record of what happened, and the action behind that chip
 * revalidates the orders list, not this route.
 */
function StatusChip({ status }: { status: DeliveryStatus }) {
  const s = DELIVERY_STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium ${s.chip}`}
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
    <div className="flex items-baseline justify-between gap-6">
      <dt className={label}>{title}</dt>
      <dd className="text-xs font-medium">{children}</dd>
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
    <div className="max-w-3xl">
      {/* App chrome. Sits outside the sheet and out of the print stylesheet, so
          neither a crop nor a PDF picks it up. */}
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback="/user/order" />
      </div>

      <article
        data-print-sheet
        className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm"
      >
        {/* Letterhead: the dark berry slab, and the only heavy colour on the
            sheet apart from the total. */}
        <header className="flex items-start justify-between gap-4 bg-sidebar px-6 py-6 text-sidebar-foreground sm:px-10 sm:py-7">
          <p className="text-base font-bold tracking-[0.22em] text-sidebar-accent-foreground uppercase">
            Ralla
          </p>
          <div className="text-right">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase opacity-75">
              Invoice
            </p>
            <h1 className="numeric mt-1 font-mono text-sm font-semibold text-sidebar-accent-foreground">
              {order.code}
            </h1>
          </div>
        </header>

        <div className="px-6 py-7 sm:px-10 sm:py-9">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
  
              {/* The snapshot, not the customer's current record — this is
                  where the parcel was actually addressed. */}
              <address className="mt-2 text-xs leading-relaxed not-italic">
                {customer ? (
                  <Link
                    href={`/user/customer/${customer.code}`}
                    className="font-medium hover:underline"
                  >
                    {order.customerName}
                  </Link>
                ) : (
                  <span className="font-medium">{order.customerName}</span>
                )}
                <div className="numeric text-muted-foreground">
                  {order.phone}
                </div>
                <div className="mt-1.5 text-muted-foreground">
                  {order.address ? <div>{order.address}</div> : null}
                  <div>{order.city}</div>
                </div>
              </address>
            </div>

            <dl className="space-y-2.5 sm:ml-auto sm:w-60">
              <MetaRow title="Date">
                <span className="numeric">{formatDateTime(order.placedAt)}</span>
              </MetaRow>
              <MetaRow title="Payment">
                <span
                  className={
                    order.paymentMethod === "refunded"
                      ? "text-destructive"
                      : undefined
                  }
                >
                  {PAYMENT_METHOD[order.paymentMethod]}
                </span>
              </MetaRow>
              <MetaRow title="Status">
                <StatusChip status={order.status} />
              </MetaRow>
            </dl>
          </div>

          {/* Qty and unit price are their own columns from `sm` up; on a phone
              they collapse into a sub-line so the row never scrolls sideways. */}
          <table className="mt-9 w-full text-xs">
            <thead>
              <tr className="border-b">
                <th scope="col" className={`${label} pb-2 text-left`}>
                  Item
                </th>
                <th
                  scope="col"
                  className={`${label} hidden pb-2 pl-4 text-right sm:table-cell`}
                >
                  Qty
                </th>
                <th
                  scope="col"
                  className={`${label} hidden pb-2 pl-6 text-right sm:table-cell`}
                >
                  Unit price
                </th>
                <th scope="col" className={`${label} pb-2 pl-6 text-right`}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Names and prices as they were at time of sale — the line's own
                  snapshot, not today's catalog entry. */}
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4">
                    <span className="font-medium">{item.name}</span>
                    <span className="numeric mt-0.5 block text-[11px] text-muted-foreground sm:hidden">
                      {item.quantity} × {formatKyat(item.unitPrice)}
                    </span>
                  </td>
                  <td className="numeric hidden py-3 pl-4 text-right text-muted-foreground sm:table-cell">
                    {item.quantity}
                  </td>
                  <td className="numeric hidden py-3 pl-6 text-right text-muted-foreground sm:table-cell">
                    {formatKyat(item.unitPrice)}
                  </td>
                  <td className="numeric py-3 pl-6 text-right font-medium">
                    {formatKyat(lineTotal(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <div className="flex w-full max-w-[17rem] items-baseline justify-between gap-4 border-t-2 border-primary pt-3">
              <div>
                <p className={label}>Total</p>
                <p className="numeric mt-0.5 text-[11px] text-muted-foreground">
                  {itemCount(order.items)} items
                </p>
              </div>
              <p className="numeric text-xl font-semibold text-primary">
                {formatKyat(order.total)}
              </p>
            </div>
          </div>


        </div>
      </article>

      {/* Outside the sheet on purpose: who moved the order and when is an
          internal record, so it stays off both the print and a crop of the
          invoice. Oldest first, so it reads downwards as it happened. */}
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
                const current = i === events.length - 1;
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
                      {event.changedBy ? ` · ${event.changedBy}` : null}
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
