import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { TruckDeliveryIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        <CardAction className="text-[11px] text-muted-foreground">
          {note}
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Holds the panel's height so an empty dashboard doesn't collapse. */
function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center text-center">
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
    <div className="space-y-5">
      <h1 className="sr-only">Dashboard</h1>
      {/* Two per row only from `lg`: below that a month of ticks squeezed into
          half a phone is unreadable. */}
      <div className="grid gap-5 lg:grid-cols-2">
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

      <Card>
        <CardHeader className="border-b">
          <CardTitle>By delivery status</CardTitle>
          <CardAction className="text-[11px] tabular-nums text-muted-foreground">
            {orders.length > 0 ? `${orders.length} total` : null}
          </CardAction>
        </CardHeader>
        {orders.length === 0 ? (
          <CardContent>
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-accent text-muted-foreground">
                <HugeiconsIcon
                  icon={TruckDeliveryIcon}
                  size={20}
                  strokeWidth={1.5}
                />
              </span>
              <p className="mt-3 text-xs font-medium">No orders yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Orders you save will appear here.
              </p>
              <Button
                variant="outline"
                nativeButton={false}
                className="mt-4"
                render={<Link href="/user/order/new" />}
              >
                Add the first order
              </Button>
            </div>
          </CardContent>
        ) : (
          <ul className="divide-y">
            {(Object.keys(DELIVERY_STATUS) as DeliveryStatus[]).map((s) => {
              const count = byStatus[s] ?? 0;
              const share = Math.round((count / orders.length) * 100);
              return (
                <li
                  key={s}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                >
                  <span
                    className={`size-2 shrink-0 rounded-full ${DELIVERY_STATUS[s].dot}`}
                    aria-hidden
                  />
                  <span className="w-24 shrink-0 text-xs font-medium">
                    {DELIVERY_STATUS[s].label}
                  </span>
                  <span className="w-10 shrink-0 text-right text-xs tabular-nums">
                    {count}
                  </span>
                  <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${DELIVERY_STATUS[s].dot}`}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                    {share}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
