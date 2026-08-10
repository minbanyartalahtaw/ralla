"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { LabelledCount } from "@/lib/orders";

/**
 * A named-category breakdown — best sellers, orders per city.
 *
 * Horizontal bars, because the category names are long: as columns the labels
 * would have to rotate, and rotated text is read slower than it is written.
 *
 * One series, so no legend and one hue. Magnitude is the whole job here, and a
 * second colour would imply the categories differ in kind rather than in size.
 */
export function BreakdownChart({
  data,
  unit,
}: {
  data: LabelledCount[];
  /** What one unit is, for the tooltip: "units", "orders". */
  unit: string;
}) {
  const config = {
    value: { label: unit, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  // Enough room per bar to stay under the 24px cap without the rows crowding.
  const height = Math.max(140, data.length * 36 + 24);

  // Only meaningful when the axis label is an abbreviation of something.
  const expandable = data.some((d) => d.detail);
  // Recharts hands the tick formatter the category value, so the long name has
  // to be looked up from it.
  const names = new Map(data.map((d) => [d.label, d.detail ?? d.label]));
  const [picked, setPicked] = React.useState<LabelledCount | null>(null);

  return (
    <>
    <ChartContainer
      config={config}
      // Clicking a bar focuses Recharts' layer group, and the focus ring then
      // frames the whole chart. Keyboard focus keeps it — arrow keys really do
      // walk the bars — but a mouse click shouldn't leave a box behind.
      className="aspect-auto w-full [&_g:focus:not(:focus-visible)]:outline-none"
      style={{ height }}
    >
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          dataKey="value"
          tickLine={false}
          axisLine={false}
          // Counts are whole things; a "1.5 orders" tick would be nonsense.
          allowDecimals={false}
        />
        {/* The axis prints the name, not the SKU. Long ones are cut rather
            than wrapped — a wrapped tick pushes its neighbours around and the
            full name is a hover or a click away. */}
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          // Recharts wraps a tick at the axis width by default, which turns a
          // long name into two ragged lines and shoves the rows apart. A tick
          // width this wide never triggers the break; the formatter below is
          // what keeps the text inside the gutter.
          tick={{ width: 400 }}
          tickFormatter={(label: string) => {
            const name = names.get(label) ?? label;
            return name.length > 15 ? `${name.slice(0, 14)}…` : name;
          }}
        />
        {/* SKU and name together — the hover label is where the axis
            abbreviation gets spelled out. */}
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(label, payload) => {
                const row = payload?.[0]?.payload as LabelledCount | undefined;
                return row?.detail ? `${row.label} · ${row.detail}` : label;
              }}
            />
          }
        />
        {/* Square where it leaves the baseline, rounded at the data end, so the
            bar's length is never overstated by its corner. */}
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
          className={expandable ? "cursor-pointer" : undefined}
          onClick={(entry: unknown) => {
            if (!expandable) return;
            const row = entry as LabelledCount;
            // Clicking the open one closes it, so the row is a toggle.
            setPicked((current) => (current?.label === row.label ? null : row));
          }}
        />
      </BarChart>
    </ChartContainer>

      {expandable ? (
        // Reserved whether or not something is picked, so choosing a bar never
        // reflows the panel — and the hint tells you the bars are clickable,
        // which a bar chart otherwise gives no sign of.
        <p className="mt-2 min-h-4 text-[11px]">
          {picked ? (
            // No SKU here — it's already on the axis beside the bar you clicked.
            <>
              <span className="font-medium">{picked.detail}</span>
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <span className="numeric text-muted-foreground">
                {picked.value} {unit}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              Select a bar to see its full name
            </span>
          )}
        </p>
      ) : null}
    </>
  );
}
