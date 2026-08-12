/** Turns a typed query into a literal, so `(` and `.` can't act as operators. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Marks the part of `text` that matched the search.
 *
 * The list is already filtered by the time this runs, so every row on screen
 * matches somewhere — the highlight says *where*, which is the thing a filtered
 * list otherwise leaves you to find by eye. That only holds if it marks
 * everything the search matched on: a row that appears with nothing highlighted
 * reads as a bug, whatever the reason.
 *
 * Not a `<mark>`: the browser default is a yellow that belongs to no part of
 * this palette, and yellow is already spoken for by the "shipped" status. Solid
 * primary keeps the one meaning of yellow intact and still reads at a glance —
 * a tint of it was there first and disappeared into the row.
 *
 * White on `--primary` clears AA in both themes: 6.3:1 on the light ramp
 * (recorded in globals.css) and 5.2:1 on the darker one dark mode swaps in.
 */
export function Highlight({
  text,
  query,
  /**
   * Match the query's digits, ignoring whatever sits between them.
   *
   * For phone numbers, which are stored exactly as they were typed — both
   * `09777444622` and `09 770 112 233` are in the table. The search already
   * compares digits only, so without this a row found by typing `09770112233`
   * would show up with nothing marked on it.
   */
  digits = false,
}: {
  text: string;
  query: string;
  digits?: boolean;
}) {
  const q = query.trim();
  if (q === "") return <>{text}</>;

  let pattern: string;
  if (digits) {
    const only = q.replace(/\D/g, "");
    // Nothing numeric to match on — a name typed into a phone column.
    if (only === "") return <>{text}</>;
    // Each digit, with any run of non-digits allowed between them.
    pattern = only.split("").join("\\D*");
  } else {
    pattern = escapeRegex(q);
  }

  // The capture group keeps the matched text in the output, so the pieces can
  // be reassembled without losing the original casing of either side.
  const parts = text.split(new RegExp(`(${pattern})`, "gi"));
  // Anchored, so a part is marked only if it IS the match rather than merely
  // containing one. Split already guarantees that; this is what tells the
  // captured pieces apart from the text around them.
  const isMatch = new RegExp(`^(?:${pattern})$`, "i");

  return (
    <>
      {parts.map((part, i) =>
        part !== "" && isMatch.test(part) ? (
          <span
            key={i}
            className="rounded-[3px] bg-primary px-1 py-0.5 text-primary-foreground"
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
