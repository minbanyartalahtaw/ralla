import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Search01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DELIVERY_STATUS, DELIVERY_STATUS_KEYS } from "@/lib/orders";

const th =
  "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";
const COLUMNS = [
  "Order",
  "Customer",
  "Phone",
  "City",
  "Items",
  "Total",
  "Payment",
  "Date",
  "Delivery",
];
const tab =
  "flex shrink-0 items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1.5 text-xs text-muted-foreground";

export default function Loading() {
  return (
    <div>
      <h1 className="sr-only">Orders</h1>

      {/* The toolbar doesn't depend on the query — it renders for real, so
          "New order" is clickable immediately instead of waiting on the list. */}
      <div className="flex items-center gap-3">
        <InputGroup className="max-w-xs">
          <InputGroupAddon>
            <InputGroupText className="numeric font-mono">RL-</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            placeholder=""
            aria-label="Search orders by order ID, without the RL- prefix"
            disabled
            className="numeric font-mono"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="sm" variant="ghost" disabled>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
              Search
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        <Button nativeButton={false} render={<Link href="/user/order/new" />}>
          <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
          New order
        </Button>
      </div>

      {/* Real labels and dot colours — the counts are the only unknown part,
          so only they shimmer. */}
      <div className="mt-4 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        <span className={tab}>
          All
          <Skeleton className="h-3 w-4" />
        </span>
        {DELIVERY_STATUS_KEYS.map((s, i) => (
          <span key={s} className={tab}>
            <span
              className={`size-1.5 shrink-0 rounded-full ${DELIVERY_STATUS[s].dot}`}
              aria-hidden
            />
            {DELIVERY_STATUS[s].label}
            <Skeleton
              className="h-3 w-4"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          </span>
        ))}
      </div>

      <div className="mt-4 rounded-lg border bg-card">
        <Table className="min-w-[1240px]">
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              {COLUMNS.map((c) => (
                <TableHead key={c} className={th}>
                  {c}
                </TableHead>
              ))}
              <TableHead className={th}>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, row) => (
              <TableRow key={row}>
                {COLUMNS.map((c, col) => (
                  <TableCell key={c}>
                    <Skeleton
                      className="h-3.5 w-full max-w-24"
                      style={{ animationDelay: `${(row + col) * 40}ms` }}
                    />
                  </TableCell>
                ))}
                <TableCell />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
