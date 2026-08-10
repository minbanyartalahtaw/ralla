/**
 * `2026-08-09` → `Aug 9`, for a time axis that has to fit several ticks.
 *
 * Read back as UTC because that is how the label was built — the day was
 * already resolved to Yangon time upstream, and re-interpreting the string in
 * the browser's zone would shift it back by a day for anyone west of Myanmar.
 */
export function tickDate(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}
