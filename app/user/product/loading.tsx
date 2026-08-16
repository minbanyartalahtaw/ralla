import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Search01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
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

const th =
  "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";
const COLUMNS = ["SKU", "Stock", "Name", "Price", "Added", "Status"];

export default function Loading() {
  return (
    <div>
      <h1 className="sr-only">Products</h1>

      {/* The toolbar doesn't depend on the query — it renders for real, so
          "New product" is clickable immediately instead of waiting on the list. */}
      <div className="flex items-center gap-3">
        <InputGroup className="max-w-xs">
          <InputGroupInput
            placeholder="Product name"
            aria-label="Search products by name"
            disabled
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="sm" variant="ghost" disabled>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
              Search
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        <Button nativeButton={false} render={<Link href="/user/product/new" />}>
          <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
          New product
        </Button>
      </div>

      <div className="mt-4 rounded-lg border bg-card">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              {COLUMNS.map((c) => (
                <TableHead
                  key={c}
                  className={c === "Price" ? `${th} text-right` : th}
                >
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, row) => (
              <TableRow key={row}>
                {COLUMNS.map((c, col) => (
                  <TableCell key={c}>
                    <Skeleton
                      className="h-3.5 w-full max-w-20"
                      style={{ animationDelay: `${(row + col) * 40}ms` }}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
