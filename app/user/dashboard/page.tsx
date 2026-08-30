import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { TruckDeliveryIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  listOrders,
  ordersByCity,
  revenueByDay,
  topProductsByUnits,
} from "@/lib/order-store";
import { DELIVERY_STATUS, type DeliveryStatus } from "@/lib/orders";

import { BreakdownChart, OrdersChart, RevenueChart } from "./lazy-charts";
import { parseTrendRange, trendRange, trendSeries } from "./trend-range";
import { TrendRangeSelect } from "./trend-range-select";

export const metadata: Metadata = {
  title: "Dashboard — RALLA",
};

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  /** The caption, or the control that replaced it. */
  note: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-5 py-3">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {/* The caveats live in the header, not under the plot — they qualify
            what is being counted, and a reader needs them before the number. */}
        <div className="text-[11px] text-muted-foreground">{note}</div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Holds the panel's height so an empty dashboard doesn't collapse. */
function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: PageProps<"/user/dashboard">) {
  const { revenue: rawRevenue, orders: rawOrders } = await searchParams;
  const revenueRange = parseTrendRange(rawRevenue);
  const ordersRange = parseTrendRange(rawOrders);

  const [orders, trend, topProducts, cities] = await Promise.all([
    listOrders(),
    // One pass over the wider of the two windows; the narrower panel takes its
    // days off the end of the same series rather than asking the database twice.
    revenueByDay(
      Math.max(trendRange(revenueRange).days, trendRange(ordersRange).days),
    ),
    topProductsByUnits(),
    ordersByCity(),
  ]);

  const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const revenueSeries = trendSeries(trend, revenueRange);
  const ordersSeries = trendSeries(trend, ordersRange);
  // Emptiness is a fact about the shop, not about the chosen window: a quiet
  // week belongs on the chart as a row of zeros, and only a shop that has never
  // sold anything gets told there is nothing to plot. Cancelled orders don't
  // count, matching what revenueByDay() leaves out.
  const sold = orders.some((o) => o.status !== "cancelled");

  return (
    <div className="space-y-6">
      {/* Two per row only from `lg`: below that a month of ticks squeezed into
          half a phone is unreadable. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="ရောင်းရငွေ"
          note={
            <TrendRangeSelect
              panel="ရောင်းရငွေ"
              param="revenue"
              value={revenueRange}
            />
          }
        >
          {sold ? (
            <RevenueChart
              data={revenueSeries.points}
              bucket={revenueSeries.bucket}
            />
          ) : (
            <Empty label="No revenue yet" />
          )}
        </Panel>

        <Panel
          title="အော်ဒါ"
          note={
            <TrendRangeSelect panel="အော်ဒါ" param="orders" value={ordersRange} />
          }
        >
          {sold ? (
            <OrdersChart
              data={ordersSeries.points}
              bucket={ordersSeries.bucket}
            />
          ) : (
            <Empty label="No orders yet" />
          )}
        </Panel>

        <Panel title="Best sellers" note="all time">
          {topProducts.length > 0 ? (
            <BreakdownChart data={topProducts} unit="units" />
          ) : (
            <Empty label="Nothing sold yet" />
          )}
        </Panel>

        <Panel title="မြို့အလိုက် အော်ဒါ" note="all time">
          {cities.length > 0 ? (
            <BreakdownChart data={cities} unit="orders" />
          ) : (
            <Empty label="Nothing delivered yet" />
          )}
        </Panel>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3">
          <h2 className="text-[13px] font-semibold">By delivery status</h2>
        </div>
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
      </section>
    </div>
  );
}
