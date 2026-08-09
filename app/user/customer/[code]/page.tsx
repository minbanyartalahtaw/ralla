import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  TiktokIcon,
  TruckDeliveryIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { getCustomerByCode } from "@/lib/customer-store";
import { listOrdersByCustomer } from "@/lib/order-store";
import { formatTiktokHandle } from "@/lib/customers";
import {
  DELIVERY_STATUS,
  formatDate,
  formatKyat,
  itemCount,
  type DeliveryStatus,
  type OrderWithItems,
} from "@/lib/orders";
import { BackButton } from "@/components/back-button";

/**
 * `generateMetadata` and the page body both need the customer, and both run on
 * the same request — cache() makes that one query rather than two.
 */
const loadCustomer = cache(getCustomerByCode);

export async function generateMetadata({
  params,
}: PageProps<"/user/customer/[code]">): Promise<Metadata> {
  const { code } = await params;
  const customer = await loadCustomer(code);

  return {
    title: customer ? `${customer.name} — RALLA` : "Customer not found — RALLA",
  };
}

const label = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

/**
 * The read-only twin of the orders table's StatusSelect. Deliberately not
 * clickable: this page is a record of what happened, and its action revalidates
 * the orders list, not this route — a chip that changed here and then silently
 * reverted on refresh would be worse than one that doesn't invite the click.
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

/**
 * Up to two initials for the avatar. Staff recognise a customer by face and
 * handle, and a record has neither — a monogram at least gives the page
 * something to be remembered by, and the same one every time.
 */
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-card px-3 py-3 sm:px-4">
      <dt className={label}>{title}</dt>
      <dd className="numeric mt-1 text-xs font-semibold sm:text-sm">{value}</dd>
    </div>
  );
}

/** Label left, value right — the one shape that survives a 320px screen. */
function Row({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className={`${label} shrink-0`}>{title}</dt>
      <dd className="text-right text-xs">{children}</dd>
    </div>
  );
}

/**
 * Cancelled orders are left out of the count and the total: they were voided
 * before dispatch, so counting them would credit this customer with money that
 * never moved. They stay in the list below, because "we cancelled three of
 * their orders" is exactly the kind of thing staff open this page to find out.
 */
function settled(orders: OrderWithItems[]) {
  return orders.filter((o) => o.status !== "cancelled");
}

export default async function CustomerDetailPage({
  params,
}: PageProps<"/user/customer/[code]">) {
  const { code } = await params;
  const customer = await loadCustomer(code);
  if (!customer) notFound();

  const orders = await listOrdersByCustomer(customer.id);
  const counted = settled(orders);
  const totalSpent = counted.reduce((sum, o) => sum + o.total, 0);
  // Orders come back newest first, so the most recent settled one leads.
  const lastOrder = counted[0];

  return (
    <div className="max-w-3xl">
      <BackButton fallback="/user/customer" />

      <section className="mt-3 overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-start gap-4 p-5">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            aria-hidden
          >
            {initials(customer.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">
              {customer.name}
            </h1>
            {/* The permanent identity — a handle can be renamed, this can't, so
                it's the one field that stays out of the editable list below. */}
            <p className="numeric mt-1 font-mono text-[11px] text-muted-foreground">
              {customer.code}
            </p>
          </div>
        </div>

        {/* Three across even on a phone — the values are short, and stacking
            them would push the one number staff came for below the fold. */}
        <dl className="grid grid-cols-3 gap-px border-t bg-border">
          <Stat title="Orders" value={String(counted.length)} />
          <Stat title="Spent" value={formatKyat(totalSpent)} />
          <Stat
            title="Last order"
            value={lastOrder ? formatDate(lastOrder.placedAt) : "—"}
          />
        </dl>
      </section>

      {/* Every editable field in one card, in one shape — an Edit button added
          to this heading later has a single list to act on. */}
      <section className="mt-6">
        <h2 className={label}>Details</h2>
        <dl className="mt-2 divide-y rounded-lg border bg-card">
          <Row title="Name">
            <span className="font-medium">{customer.name}</span>
          </Row>
          <Row title="TikTok">
            <a
              href={`https://www.tiktok.com/@${customer.tiktokUsername}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] hover:underline"
            >
              <HugeiconsIcon icon={TiktokIcon} size={11} strokeWidth={2} />
              {formatTiktokHandle(customer.tiktokUsername)}
            </a>
          </Row>
          <Row title="TikTok name">
            {customer.tiktokName || (
              <span className="text-muted-foreground/50">—</span>
            )}
          </Row>
          <Row title="Mobile">
            <span className="numeric">{customer.phone}</span>
          </Row>
          <Row title="City">{customer.city}</Row>
          <Row title="Address">{customer.address}</Row>
          <Row title="Note">
            {customer.note || (
              <span className="text-muted-foreground/50">—</span>
            )}
          </Row>
          <Row title="Added">
            <span className="numeric">{formatDate(customer.createdAt)}</span>
          </Row>
        </dl>
      </section>

      <section className="mt-6">
        <h2 className={label}>Order history</h2>

        <div className="mt-2 rounded-lg border bg-card">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="text-muted-foreground">
                <HugeiconsIcon
                  icon={TruckDeliveryIcon}
                  size={32}
                  strokeWidth={1.5}
                />
              </span>
              <p className="mt-3 text-xs font-medium">No orders yet</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Orders placed for {customer.name} will appear here.
              </p>
              <Button
                variant="outline"
                nativeButton={false}
                className="mt-4"
                render={<Link href="/user/order/new" />}
              >
                New order
              </Button>
            </div>
          ) : (
            // Rows, not a table: six columns can't be read on a phone, and the
            // whole row being a link to the invoice beats a cell with a button
            // in it.
            <ul className="divide-y">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/user/order/${o.code}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="numeric font-mono text-[11px] font-medium">
                          {o.code}
                        </span>
                        <StatusChip status={o.status} />
                      </div>
                      {/* The city is the order's own snapshot — where the
                          parcel actually went, not where they live now. */}
                      <p
                        className="mt-1 truncate text-[11px] text-muted-foreground"
                        title={o.items
                          .map((i) => `${i.name} ×${i.quantity}`)
                          .join(", ")}
                      >
                        <span className="numeric">{itemCount(o.items)}</span>{" "}
                        items · {o.city}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="numeric text-xs font-medium">
                        {formatKyat(o.total)}
                      </p>
                      <p className="numeric text-[11px] text-muted-foreground">
                        {formatDate(o.placedAt)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
