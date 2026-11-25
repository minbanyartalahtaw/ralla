import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  TruckDeliveryIcon,
} from "@hugeicons/core-free-icons";

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
import {
  DELIVERY_STATUS,
  DELIVERY_STATUS_KEYS,
  formatKyat,
  type LabelledCount,
} from "@/lib/orders";
import { cn } from "@/lib/utils";

import { OrdersChart, RevenueChart } from "./lazy-charts";
import { parseTrendRange, trendRange, trendSeries } from "./trend-range";
import { TrendRangeSelect } from "./trend-range-select";

export const metadata: Metadata = {
  title: "Dashboard — RALLA",
};

function Panel({
  title,
  note,
  figure,
  children,
}: {
  title: string;
  note: React.ReactNode;
  figure?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs leading-relaxed text-muted-foreground">
          {title}
        </CardTitle>
        <CardAction className="text-[11px] text-muted-foreground">
          {note}
        </CardAction>
        {figure ? (
          <p className="numeric text-2xl leading-tight font-semibold tracking-tight">
            {figure}
          </p>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-[180px] items-center justify-center text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const RANKED_LIMIT = 6;

function rankedNote(total: number) {
  return total > RANKED_LIMIT ? `top ${RANKED_LIMIT} of ${total}` : "all time";
}

function RankedList({ data, unit }: { data: LabelledCount[]; unit: string }) {
  const rows = data.slice(0, RANKED_LIMIT);
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ol className="space-y-3.5">
      {rows.map((row, index) => (
        <li key={`${row.label}-${index}`}>
          <div className="flex items-baseline gap-2">
            <span className="numeric w-4 shrink-0 text-[11px] text-muted-foreground">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs leading-relaxed font-medium">
              {row.detail ?? row.label}
            </span>
            {row.detail ? (
              <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:inline">
                {row.label}
              </span>
            ) : null}
            <span className="numeric shrink-0 text-xs font-medium">
              {row.value}
              <span className="ml-1 font-normal text-muted-foreground">
                {unit}
              </span>
            </span>
          </div>
          <div className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
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
  const revenueTotal = revenueSeries.points.reduce((sum, p) => sum + p.revenue, 0);
  const ordersTotal = ordersSeries.points.reduce((sum, p) => sum + p.orders, 0);
  // Emptiness is a fact about the shop, not about the chosen window: a quiet
  // week belongs on the chart as a row of zeros, and only a shop that has never
  // sold anything gets told there is nothing to plot. Cancelled orders don't
  // count, matching what revenueByDay() leaves out.
  const sold = orders.some((o) => o.status !== "cancelled");

  return (
    <div className="space-y-4">
      <h1 className="sr-only">Dashboard</h1>

      <Card className="gap-0 py-0">
        <h2 className="sr-only">Orders by delivery status</h2>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
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
        ) : (
          <>
            <div aria-hidden className="flex h-1 gap-px bg-muted">
              {DELIVERY_STATUS_KEYS.map((s) =>
                byStatus[s] ? (
                  <span
                    key={s}
                    className={DELIVERY_STATUS[s].dot}
                    style={{ flexGrow: byStatus[s] }}
                  />
                ) : null,
              )}
            </div>
            <ul className="grid divide-y sm:grid-cols-5 sm:divide-x sm:divide-y-0">
              {DELIVERY_STATUS_KEYS.map((s) => {
                const count = byStatus[s] ?? 0;
                const share = Math.round((count / orders.length) * 100);
                return (
                  <li key={s}>
                    <Link
                      href={`/user/order?status=${s}`}
                      className="group flex h-full items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:flex-col sm:items-start sm:gap-1.5 sm:py-4"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium text-muted-foreground sm:flex-none">
                        <span
                          aria-hidden
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            DELIVERY_STATUS[s].dot,
                          )}
                        />
                        {DELIVERY_STATUS[s].label}
                      </span>
                      <span className="flex items-baseline gap-2">
                        <span
                          className={cn(
                            "numeric text-sm font-semibold tracking-tight sm:text-2xl sm:leading-tight",
                            count === 0 && "text-muted-foreground",
                          )}
                        >
                          {count}
                        </span>
                        <span className="numeric w-9 text-right text-[11px] text-muted-foreground sm:w-auto">
                          {share}%
                        </span>
                      </span>
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={14}
                        strokeWidth={2}
                        className="shrink-0 text-muted-foreground sm:hidden"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {/* Two per row only from `lg`: below that a month of ticks squeezed into
          half a phone is unreadable. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="ရောင်းရငွေ"
          figure={sold ? formatKyat(revenueTotal) : undefined}
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
          figure={sold ? String(ordersTotal) : undefined}
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
            <RankedList data={topProducts} unit="units" />
          ) : (
            <Empty label="Nothing sold yet" />
          )}
        </Panel>

        <Panel title="မြို့အလိုက် အော်ဒါ" note={rankedNote(cities.length)}>
          {cities.length > 0 ? (
            <RankedList data={cities} unit="orders" />
          ) : (
            <Empty label="Nothing delivered yet" />
          )}
        </Panel>
      </div>
    </div>
  );
}
