"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { RevenueDay } from "@/lib/orders";

import { tickDate } from "./tick-date";

const config = {
  orders: { label: "Orders", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * How busy each day was, beside how much each day made.
 *
 * Deliberately its own chart rather than a second axis on the revenue line:
 * kyats and order counts share no scale, and two y-axes let the reader believe
 * whichever crossing points the layout happens to produce.
 *
 * Columns rather than a line, because a count is a tally of discrete things —
 * a line between two days implies the value passed through the days between.
 */
export function OrdersChart({ data }: { data: RevenueDay[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ top: 8, right: 12, bottom: 0, left: 4 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={tickDate}
        />
        <YAxis
          width={28}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          allowDecimals={false}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                tickDate(String(payload?.[0]?.payload?.day ?? ""))
              }
            />
          }
        />
        <Bar
          dataKey="orders"
          fill="var(--color-orders)"
          radius={[4, 4, 0, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ChartContainer>
  );
}
