import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Contact01Icon, Menu01Icon } from "@hugeicons/core-free-icons";

import { productsHref } from "./products-href";

export function ViewSwitch({
  query,
  view,
}: {
  query: string;
  view: "contact" | "table";
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
        href={productsHref({ query })}
        aria-pressed={view === "contact"}
        aria-label="Contact view"
        title="Contact view"
        className={`${base} ${view === "contact" ? on : off}`}
      >
        <HugeiconsIcon icon={Contact01Icon} size={14} strokeWidth={1.5} />
      </Link>
      <Link
        href={productsHref({ query, view: "table" })}
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
