import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { TruckDeliveryIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { listCustomers } from "@/lib/customer-store";
import { listOrders } from "@/lib/order-store";
import { DELIVERY_STATUS, formatKyat, type DeliveryStatus } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Dashboard — RALLA",
};

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="px-5 py-4 not-last:border-b sm:not-last:border-r sm:not-last:border-b-0">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="numeric mt-1.5 text-xl font-semibold tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const [orders, customers] = await Promise.all([listOrders(), listCustomers()]);

  const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  // Cancelled orders were never paid for, so they don't count as revenue.
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const inFlight = (byStatus.pending ?? 0) + (byStatus.packing ?? 0) + (byStatus.shipped ?? 0);

  return (
    <div className="space-y-6">

      <div className="grid rounded-lg border bg-card sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Orders"
          value={String(orders.length)}
          hint="All time"
        />
        <Stat
          label="In flight"
          value={String(inFlight)}
          hint="Pending, packing or shipped"
        />
        <Stat
          label="Revenue"
          value={formatKyat(revenue)}
          hint="Excludes cancelled"
        />
        <Stat
          label="Customers"
          value={String(customers.length)}
          hint="Saved for autofill"
        />
      </div>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold tracking-wide">
          By delivery status
        </h2>
        <div className="rounded-lg border bg-card">
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
              <Button
                variant="outline"
                nativeButton={false}
                className="mt-4"
                render={<Link href="/user/order/new" />}
              >
                Add the first order
              </Button>
            </div>
          ) : (
            <ul>
              {(Object.keys(DELIVERY_STATUS) as DeliveryStatus[]).map((s) => {
                const count = byStatus[s] ?? 0;
                const share = Math.round((count / orders.length) * 100);
                return (
                  <li
                    key={s}
                    className="flex items-center gap-3 px-5 py-2.5 not-last:border-b"
                  >
                    <span
                      className={`size-1.5 shrink-0 rounded-full ${DELIVERY_STATUS[s].dot}`}
                      aria-hidden
                    />
                    <span className="w-24 text-xs font-medium">
                      {DELIVERY_STATUS[s].label}
                    </span>
                    <span className="numeric w-8 text-right text-xs">
                      {count}
                    </span>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${DELIVERY_STATUS[s].dot}`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <span className="numeric w-9 text-right text-[11px] text-muted-foreground">
                      {share}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
