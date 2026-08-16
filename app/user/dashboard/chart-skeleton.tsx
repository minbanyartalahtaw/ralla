import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shaped placeholders rather than plain grey boxes — each one previews the
 * kind of chart it stands in for, so the panel reads as "about to be a bar
 * chart" instead of just "loading, unknown".
 */

const BAR_HEIGHTS = [42, 68, 55, 80, 60, 90, 48, 72, 58, 85, 40, 66];

export function OrdersChartSkeleton() {
  return (
    <div className="flex h-[220px] items-end gap-2 px-1 pb-6">
      {BAR_HEIGHTS.map((h, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-t-sm rounded-b-none"
          style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

export function RevenueChartSkeleton() {
  return (
    <div className="h-[220px] w-full pb-6">
      <svg
        viewBox="0 0 300 100"
        preserveAspectRatio="none"
        className="h-full w-full animate-pulse text-muted-foreground/30"
        aria-hidden
      >
        <polyline
          points="0,70 25,55 50,60 75,35 100,45 125,20 150,38 175,25 200,42 225,18 250,30 275,15 300,28"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const ROW_WIDTHS = [92, 78, 64, 50, 38];

export function BreakdownChartSkeleton() {
  return (
    <div className="space-y-3 py-1">
      {ROW_WIDTHS.map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton
            className="h-4 w-20 shrink-0"
            style={{ animationDelay: `${i * 60}ms` }}
          />
          <Skeleton
            className="h-4"
            style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
