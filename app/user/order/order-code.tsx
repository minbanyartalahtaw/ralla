import { normalizeOrderQuery } from "@/lib/order-store";

/**
 * An order code with the searched-for run marked inside it.
 *
 * The search matches `code contains <normalized>` (see orderWhere()), so the
 * run this marks is the same substring the database matched on — which is the
 * point: a search for `804` returns codes that look nothing alike until you
 * can see *where* each one matched.
 *
 * The query is normalized the same way the query itself is, so the `RL-` a
 * pasted code carries is stripped before the lookup and only the part that was
 * actually searched for is marked.
 */
export function OrderCode({ code, query }: { code: string; query: string }) {
  const needle = normalizeOrderQuery(query);
  const at = needle === "" ? -1 : code.toUpperCase().indexOf(needle.toUpperCase());

  if (at === -1) return <>{code}</>;

  return (
    <>
      {code.slice(0, at)}
      {/* No horizontal padding: these codes are tabular figures in a column,
          and padding a few characters would push the rest of the code out of
          the grid its neighbours line up on. */}
      <mark className="rounded-[2px] bg-primary/15 text-foreground">
        {code.slice(at, at + needle.length)}
      </mark>
      {code.slice(at + needle.length)}
    </>
  );
}
