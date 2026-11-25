import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";

import { getCustomerBySlug } from "@/lib/customer-store";
import { listOrdersByCustomer } from "@/lib/order-store";
import Link from "next/link";

import { DELIVERY_STATUS, formatDate, formatKyat, type OrderWithItems } from "@/lib/orders";
import { BackButton } from "@/components/back-button";
import { RecordCrumb } from "@/app/office/[section]/_components/user-breadcrumb";
import { AvatarPicker } from "./avatar-picker";
import { DetailsCard } from "./details-card";
import { getSection } from "@/app/office/[section]/_components/section";
import { CustomerAvatar } from "@/components/customer-avatar";
import { getCurrentStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";

/**
 * `generateMetadata` and the page body both need the customer, and both run on
 * the same request — cache() makes that one query rather than two.
 */
const loadCustomer = cache(getCustomerBySlug);

export async function generateMetadata({
  params,
}: PageProps<"/office/[section]/customer/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const customer = await loadCustomer(slug);

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
}: PageProps<"/office/[section]/customer/[slug]">) {
  const { section, base } = await getSection(params);
  const { slug } = await params;
  // The full screen needs both the admin section and the right to edit. Staff —
  // and an admin looking at the staff section — get the read-only one, which
  // also leaves out what the customer has spent in total.
  const staff = await getCurrentStaff();
  const editable = section === "admin" && staff !== null && can(staff, "manageCustomers");
  const customer = await loadCustomer(slug);
  if (!customer) notFound();

  const orders = await listOrdersByCustomer(customer.id);
  const counted = settled(orders);
  const totalSpent = counted.reduce((sum, o) => sum + o.total, 0);
  // Orders come back newest first, so the most recent settled one leads.
  const lastOrder = counted[0];

  return (
    <div className="mx-auto max-w-[640px]">
      <RecordCrumb label={customer.code} />
      <BackButton fallback={`${base}/customer`} />

      <section className="mt-3 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4 px-5 py-6 sm:gap-5 sm:px-8 sm:py-7">
          {editable ? (
            <AvatarPicker customer={customer} />
          ) : (
            <CustomerAvatar
              customer={customer}
              className="size-14 shrink-0 text-[15px] shadow-sm ring-2 ring-border/50"
            />
          )}
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
        <dl
          className={`grid divide-x divide-border border-t bg-muted/20 ${editable ? "grid-cols-3" : "grid-cols-2"}`}
        >
          <Stat title="Orders" value={String(counted.length)} />
          {editable ? <Stat title="Spent" value={formatKyat(totalSpent)} /> : null}
          <Stat
            title="Last order"
            value={lastOrder ? formatDate(lastOrder.placedAt) : "—"}
          />
        </dl>
      </section>

      <DetailsCard customer={customer} readOnly={!editable} />

      {/* Every order, cancelled ones too — see settled(). Linked inside the
          section this page is in. */}
      <section className="mt-6">
        <h2 className={`${label} px-1`}>Orders</h2>
        {orders.length === 0 ? (
          <p className="mt-2 rounded-lg border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
            No orders yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y overflow-hidden rounded-lg border bg-card">
            {orders.map((o) => {
              const s = DELIVERY_STATUS[o.status];
              return (
                <li key={o.id}>
                  <Link
                    href={`${base}/order/${o.slug}`}
                    className="flex items-center gap-3 px-4 py-3 text-xs transition-colors hover:bg-muted/40"
                  >
                    <span className="numeric font-mono font-semibold">{o.code}</span>
                    <span className="numeric flex-1 text-muted-foreground">
                      {formatDate(o.placedAt)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${s.chip}`}
                    >
                      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />
                      {s.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
