import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Package02Icon, PlusSignIcon, Search01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { CreatedToast } from "@/components/created-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProducts, normalizeProductQuery } from "@/lib/product-store";

import { ActiveSelect } from "./active-select";
import { NameCell } from "./name-cell";
import { PriceCell } from "./price-cell";
import { ProductContacts } from "./product-contacts";
import { ProductSearch } from "./product-search";
import { SkuCell } from "./sku-cell";
import { StockCell } from "./stock-cell";
import { ViewSwitch } from "./view-switch";

export const metadata: Metadata = {
  title: "Products — RALLA",
};

const th = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/user/product">) {
  const { q, view: rawView, created } = await searchParams;
  const query = typeof q === "string" ? q : "";
  // Contact cards are the default; only `?view=table` selects the table.
  const view = rawView === "table" ? "table" : "contact";
  const products = await listProducts(query);
  const createdCode = typeof created === "string" ? created : undefined;

  // Two kinds of empty: a catalog with nothing in it wants "add one", a search
  // that found nothing wants to say what it looked for.
  const searched = normalizeProductQuery(query);
  const searching = searched !== "";

  return (
    <div>
      {/* The visible heading is gone — the breadcrumb already names the page.
          This keeps a top-level heading for screen readers. */}
      <h1 className="sr-only">Products</h1>

      <CreatedToast
        code={createdCode}
        message={createdCode ? `Product ${createdCode} added.` : ""}
      />

      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <ProductSearch query={query} view={view} />
        </div>

        <Button nativeButton={false} render={<Link href="/user/product/new" />}>
          <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
          New product
        </Button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
        <ViewSwitch query={query} view={view} />
      </div>

      {/* The table view clips to the radius: its header row is a square block of
          `bg-muted` that otherwise pokes out past the rounded corners. The
          contact view must NOT clip — `overflow-hidden` would make this a
          scroll container and its sticky letter headers would stop sticking. */}
      <div
        className={`mt-4 rounded-lg bg-card ${
          view === "contact" ? "" : "overflow-hidden border"
        }`}
      >
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
        ) : view === "contact" ? (
          <ProductContacts products={products} />
        ) : (
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className={th}>SKU</TableHead>
                <TableHead className={`${th}`}>Stock</TableHead>
                <TableHead className={th}>Name</TableHead>
                <TableHead className={`${th} text-right`}>Price</TableHead>
                <TableHead className={th}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id} className={p.isActive ? "" : "opacity-60"}>
                  <TableCell>
                    <SkuCell productId={p.id} sku={p.sku} />
                  </TableCell>
                  <TableCell>
                    <StockCell productId={p.id} sku={p.sku} stock={p.stock} />
                  </TableCell>
                  <TableCell>
                    <NameCell productId={p.id} name={p.name} />
                  </TableCell>
                  <TableCell>
                    <PriceCell productId={p.id} sku={p.sku} price={p.price} />
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
