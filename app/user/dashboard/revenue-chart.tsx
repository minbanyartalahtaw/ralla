"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatKyat, type RevenueDay } from "@/lib/orders";

import { tickDate } from "./tick-date";

/**
 * One series, so no legend — the heading above the chart names what is plotted.
 * `--chart-1` is berry in both themes; the token itself swaps, so one value
 * covers light and dark.
 */
const config = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Axis ticks stay short: 240,000 Ks is `240k`. */
function tickKyat(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

export function RevenueChart({ data }: { data: RevenueDay[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[220px] w-full">
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        {/* Horizontal only: vertical rules add ink without helping read a value
            off the y-axis, and the date ticks already mark the columns. */}
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
          width={40}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
          tickFormatter={tickKyat}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                tickDate(String(payload?.[0]?.payload?.day ?? ""))
              }
              formatter={(value) => formatKyat(Number(value))}
            />
          }
        />
        <Line
          dataKey="revenue"
          // Straight segments, not a spline: a curve through a spiky daily
          // series bulges past the points it connects, drawing revenue on days
          // that had none.
          type="linear"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          // No dot per day — 30 of them is noise. The hovered point gets one,
          // ringed in the surface colour so it stays legible over the line.
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </LineChart>
    </ChartContainer>
  );
}
