import type { RevenueDay } from "@/lib/orders";

/** The window a trend chart covers. The key is what travels in the URL. */
export type TrendRange = "7d" | "1m" | "2m" | "5m" | "1y";

/** How many days one plotted column adds up. */
export type TrendBucket = "day" | "week" | "month";

/** One column on a trend chart — a bucket of one or more Yangon days. */
export type TrendPoint = {
  /** `YYYY-MM-DD`, the bucket's first day. Also the x-axis key. */
  day: string;
  /** Its last day. Equal to `day` when the bucket is a single day. */
  end: string;
  revenue: number;
  orders: number;
};

/**
 * Menu order, shortest window first. `days` counts back from today, today
 * included, so "7 days" is this day and the six before it.
 *
 * The months are round counts of days rather than calendar months: the window
 * is a rolling one, and 2 months landing on 60 days keeps every option the
 * same kind of thing.
 */
export const TREND_RANGES: {
  value: TrendRange;
  label: string;
  days: number;
}[] = [
  { value: "7d", label: "7 ရက်အတွင်း", days: 7 },
  { value: "1m", label: "1 လအတွင်း", days: 30 },
  { value: "2m", label: "2 လအတွင်း", days: 60 },
  { value: "5m", label: "5 လအတွင်း", days: 150 },
  { value: "1y", label: "1 နှစ်အတွင်း", days: 365 },
];

/** What a panel shows until the URL says otherwise. */
export const DEFAULT_TREND_RANGE: TrendRange = "7d";

export function trendRange(value: TrendRange) {
  return TREND_RANGES.find((r) => r.value === value)!;
}

/** `?revenue=` / `?orders=` are unvalidated strings; anything else is the default. */
export function parseTrendRange(
  raw: string | string[] | undefined,
): TrendRange {
  return TREND_RANGES.some((r) => r.value === raw)
    ? (raw as TrendRange)
    : DEFAULT_TREND_RANGE;
}

/**
 * The bucket a window of `days` plotted days deserves.
 *
 * A year of daily columns is 365 marks across ~500px — under two pixels each,
 * which is noise rather than a trend. Decided on the days actually plotted, not
 * on the range asked for, so a year selected on a three-week-old shop still
 * draws the days it has.
 */
export function bucketFor(days: number): TrendBucket {
  if (days <= 45) return "day";
  if (days <= 180) return "week";
  return "month";
}

/**
 * Sum a daily series into `bucket`-sized columns, oldest first.
 *
 * Weeks are chunked backwards from the most recent day rather than snapped to
 * a Monday, so the rightmost column is always the last seven days — the one a
 * reader compares against. That leaves the oldest chunk short whenever the
 * window doesn't divide by seven, which is why a point carries its `end`: the
 * tooltip names the span it really covers instead of implying a full week.
 */
export function bucketTrend(
  days: RevenueDay[],
  bucket: TrendBucket,
): TrendPoint[] {
  const points: TrendPoint[] = [];
  let key: string | null = null;

  for (let i = 0; i < days.length; i += 1) {
    const d = days[i];
    const next =
      bucket === "day"
        ? d.day
        : bucket === "month"
          ? d.day.slice(0, 7)
          : String(Math.floor((days.length - 1 - i) / 7));

    if (next !== key) {
      key = next;
      points.push({ day: d.day, end: d.day, revenue: 0, orders: 0 });
    }

    const point = points[points.length - 1];
    point.revenue += d.revenue;
    point.orders += d.orders;
    point.end = d.day;
  }

  return points;
}

/** The plotted series for one panel, cut out of the widest window fetched. */
export function trendSeries(trend: RevenueDay[], range: TrendRange) {
  const days = trend.slice(-trendRange(range).days);
  const bucket = bucketFor(days.length);
  return { points: bucketTrend(days, bucket), bucket };
}
