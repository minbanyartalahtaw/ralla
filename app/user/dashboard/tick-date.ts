import type { TrendBucket, TrendPoint } from "./trend-range";

/**
 * Read a `YYYY-MM-DD` label back as UTC, because that is how it was built —
 * the day was already resolved to Yangon time upstream, and re-interpreting the
 * string in the browser's zone would shift it back by a day for anyone west of
 * Myanmar.
 */
function utcDay(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

/** `2026-08-09` → `Aug 9`, for a time axis that has to fit several ticks. */
export function tickDate(day: string) {
  return utcDay(day).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

/**
 * The axis tick for a column. Monthly columns drop the day — `Aug 1` on a bar
 * that stands for the whole of August invites reading it as one day's takings.
 */
export function tickPeriod(day: string, bucket: TrendBucket) {
  if (bucket !== "month") return tickDate(day);
  return utcDay(day).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
  });
}

/** Whether a monthly column actually holds every day of its month. */
function wholeMonth(point: TrendPoint) {
  if (!point.day.endsWith("-01")) return false;
  const end = utcDay(point.end);
  const [year, month] = point.day.split("-").map(Number);
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(year, month, 0));
  return end.getTime() === last.getTime();
}

/**
 * The tooltip heading: the whole span the column covers. A week or a month is
 * a total, and naming only its first day would read as a daily figure.
 *
 * A rolling window opens and closes mid-month, so its outer monthly columns
 * hold part of one. Calling a column with three days in it "August" would read
 * as a terrible August, so a partial month names its span the way a week does.
 */
export function periodLabel(
  point: TrendPoint | undefined,
  bucket: TrendBucket,
) {
  if (!point) return "";
  if (bucket === "month" && wholeMonth(point)) {
    return utcDay(point.day).toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    });
  }
  if (point.end === point.day) return tickDate(point.day);
  return `${tickDate(point.day)} – ${tickDate(point.end)}`;
}
