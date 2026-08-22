import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  GridViewIcon,
  Menu01Icon,
} from "@hugeicons/core-free-icons";

import { ordersHref } from "./orders-href";

/**
 * Card-vs-table switcher for the orders list. Two plain links, not a client
 * toggle: the choice lives in the URL (`?view=table`) beside `?q=` and
 * `?status=`, so it survives reload and can be shared — same reasoning as the
 * status tabs. Cards are the default, so their link has no `view` param.
 *
 * `page` comes along too — switching layout doesn't change what's being
 * looked at, just how, so page 2 of the table should still be page 2 of the
 * cards.
 */
export function ViewSwitch({
  query,
  status,
  page,
  view,
}: {
  query: string;
  status?: keyof typeof import("@/lib/orders").DELIVERY_STATUS;
  page?: number;
  view: "card" | "table";
}) {
  const base =
    "inline-flex size-6 items-center justify-center rounded-sm border text-xs transition-colors";
  const on = "border-primary/40 bg-primary/10 text-foreground";
  const off = "border-transparent text-muted-foreground hover:bg-muted";

  return (
    <div
      role="group"
      aria-label="Layout"
      className="flex items-center gap-1 rounded-lg border bg-card p-1"
    >
      <Link
        href={ordersHref({ query, status, page })}
        aria-pressed={view === "card"}
        aria-label="Card view"
        title="Card view"
        className={`${base} ${view === "card" ? on : off}`}
      >
        <HugeiconsIcon icon={GridViewIcon} size={14} strokeWidth={1.5} />
      </Link>
      <Link
        href={ordersHref({ query, status, page, view: "table" })}
        aria-pressed={view === "table"}
        aria-label="Table view"
        title="Table view"
        className={`${base} ${view === "table" ? on : off}`}
      >
        <HugeiconsIcon icon={Menu01Icon} size={14} strokeWidth={1.5} />
      </Link>
    </div>
  );
}
