import { Skeleton } from "@/components/ui/skeleton";

import {
  BreakdownChartSkeleton,
  OrdersChartSkeleton,
  RevenueChartSkeleton,
} from "./chart-skeleton";

// Titles are known ahead of the data and never change, so they render for
// real here — only the note (which depends on the trend window) and the plot
// itself are placeholders. Swapping in the live page then shifts nothing but
// those two things.
function PanelSkeleton({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b px-5 py-3">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <h1 className="bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-xl font-bold tracking-[0.2em] text-transparent uppercase">
        Dashboard
      </h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSkeleton title="Revenue">
          <RevenueChartSkeleton />
        </PanelSkeleton>

        <PanelSkeleton title="Orders per day">
          <OrdersChartSkeleton />
        </PanelSkeleton>

        <PanelSkeleton title="Best sellers">
          <BreakdownChartSkeleton />
        </PanelSkeleton>

        <PanelSkeleton title="Orders by city">
          <BreakdownChartSkeleton />
        </PanelSkeleton>
      </div>

      <section className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3">
          <h2 className="text-[13px] font-semibold">By delivery status</h2>
        </div>
        <ul>
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-5 py-2.5 not-last:border-b"
            >
              <Skeleton
                className="size-1.5 shrink-0 rounded-full"
                style={{ animationDelay: `${i * 80}ms` }}
              />
              <Skeleton
                className="h-3 w-24"
                style={{ animationDelay: `${i * 80}ms` }}
              />
              <Skeleton
                className="h-3 w-8"
                style={{ animationDelay: `${i * 80}ms` }}
              />
              <Skeleton
                className="h-1.5 min-w-0 flex-1 rounded-full"
                style={{ animationDelay: `${i * 80}ms` }}
              />
              <Skeleton
                className="h-3 w-9"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
