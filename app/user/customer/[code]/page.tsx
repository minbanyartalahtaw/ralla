import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";

import { getCustomerByCode } from "@/lib/customer-store";
import { listOrdersByCustomer } from "@/lib/order-store";
import { formatDate, formatKyat, type OrderWithItems } from "@/lib/orders";
import { BackButton } from "@/components/back-button";
import { AvatarPicker } from "./avatar-picker";
import { DetailsCard } from "./details-card";

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

const label = "text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase";

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="px-3 py-4 text-center sm:px-4 sm:py-5">
      <dt className={label}>{title}</dt>
      <dd className="numeric mt-1.5 text-sm font-semibold tracking-tight text-foreground sm:text-[15px]">{value}</dd>
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
    <div className="mx-auto max-w-[640px]">
      <BackButton fallback="/user/customer" />

      <section className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4 px-5 py-6 sm:gap-5 sm:px-8 sm:py-7">
          <AvatarPicker customer={customer} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-semibold tracking-tight text-foreground sm:text-lg">
              {customer.name}
            </h1>
            {/* The permanent identity — a handle can be renamed, this can't, so
                it's the one field that stays out of the editable list below. */}
            <p className="numeric mt-1 inline-flex items-center rounded-full bg-muted px-2.5 py-1 font-mono text-[11px] font-medium leading-none text-muted-foreground">
              {customer.code}
            </p>
          </div>
        </div>

        {/* Three across even on a phone — the values are short, and stacking
            them would push the one number staff came for below the fold. */}
        <dl className="grid grid-cols-3 divide-x divide-border border-t bg-muted/20">
          <Stat title="Orders" value={String(counted.length)} />
          <Stat title="Spent" value={formatKyat(totalSpent)} />
          <Stat
            title="Last order"
            value={lastOrder ? formatDate(lastOrder.placedAt) : "—"}
          />
        </dl>
      </section>

      <DetailsCard customer={customer} />
    </div>
  );
}
