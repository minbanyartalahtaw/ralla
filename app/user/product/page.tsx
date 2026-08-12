import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  Package02Icon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProducts, normalizeProductQuery } from "@/lib/product-store";
import { formatDate } from "@/lib/orders";

import { ActiveSelect } from "./active-select";
import { Highlight } from "@/components/highlight";
import { PriceCell } from "./price-cell";
import { StockCell } from "./stock-cell";

export const metadata: Metadata = {
  title: "Products — RALLA",
};

const th = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/user/product">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const products = await listProducts(query);

  // Two kinds of empty: a catalog with nothing in it wants "add one", a search
  // that found nothing wants to say what it looked for.
  const searched = normalizeProductQuery(query);
  const searching = searched !== "";

  return (
    <div>
      {/* The visible heading is gone — the breadcrumb already names the page.
          This keeps a top-level heading for screen readers. */}
      <h1 className="sr-only">Products</h1>

      <div className="flex items-center gap-3">
        {/* A plain GET form, so the search lands in the URL and the filtered
            list can be bookmarked and reloaded. No client JavaScript. */}
        <form method="get" className="min-w-0 flex-1">
          <InputGroup className="max-w-xs">
            <InputGroupInput
              type="search"
              name="q"
              // See the orders list: the field is uncontrolled and Base UI
              // reads `defaultValue` once, so a changed query needs a new
              // element rather than a new default on the old one.
              key={query}
              defaultValue={query}
              placeholder="Product name"
              aria-label="Search products by name"
              autoCorrect="off"
              // The browser's own clear button only empties the field — it
              // never submits, so the list stayed filtered against a box that
              // looked empty. Hidden in favour of the link below.
              className="[&::-webkit-search-cancel-button]:appearance-none"
            />
            <InputGroupAddon align="inline-end">
              {searching ? (
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  nativeButton={false}
                  render={<Link href="/user/product" />}
                  aria-label="Clear search"
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                </InputGroupButton>
              ) : null}
              <InputGroupButton type="submit" size="sm" variant="ghost">
                <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
                Search
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>

        <Button nativeButton={false} render={<Link href="/user/product/new" />}>
          <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
          New product
        </Button>
      </div>

      <div className="mt-4 rounded-lg border bg-card">
        {products.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="text-muted-foreground">
              <HugeiconsIcon
                icon={searching ? Search01Icon : Package02Icon}
                size={32}
                strokeWidth={1.5}
              />
            </span>
            {searching ? (
              <>
                <p className="mt-3 text-xs font-medium">No product matches</p>
                <p className="mt-1 text-xs text-muted-foreground">{searched}</p>
                <Button
                  variant="outline"
                  nativeButton={false}
                  className="mt-4"
                  render={<Link href="/user/product" />}
                >
                  Show all products
                </Button>
              </>
            ) : (
              <>
                <p className="mt-3 text-xs font-medium">No products yet</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Add one and it becomes selectable on a new order.
                </p>
                <Button
                  variant="outline"
                  nativeButton={false}
                  className="mt-4"
                  render={<Link href="/user/product/new" />}
                >
                  Add a product
                </Button>
              </>
            )}
          </div>
        ) : (
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className={th}>SKU</TableHead>
                <TableHead className={`${th}`}>Stock</TableHead>
                <TableHead className={th}>Name</TableHead>
                <TableHead className={`${th} text-right`}>Price</TableHead>
                <TableHead className={th}>Added</TableHead>
                <TableHead className={th}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className={p.isActive ? "" : "opacity-60"}>
                  <TableCell>
                    <span className="font-mono text-[11px] font-medium">
                      {p.sku}
                    </span>
                  </TableCell>
                                    <TableCell>
                    <StockCell productId={p.id} stock={p.stock} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Highlight text={p.name} query={searched} />
                  </TableCell>
                  <TableCell>
                    <PriceCell productId={p.id} price={p.price} />
                  </TableCell>

                  <TableCell className="numeric text-muted-foreground">
                    {formatDate(p.createdAt)}
                  </TableCell>
                  <TableCell>
                    <ActiveSelect productId={p.id} isActive={p.isActive} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
