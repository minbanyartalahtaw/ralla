import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Package02Icon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";

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
import { formatKyat } from "@/lib/orders";
import { listProducts, normalizeProductQuery } from "@/lib/product-store";
import { PRODUCT_ACTIVITY, productActivity } from "@/lib/products";

import { ProductContacts } from "./product-contacts";
import { ProductEditSheet } from "./product-edit-sheet";
import { ProductSearch } from "./product-search";
import { productsHref } from "./products-href";
import { ViewSwitch } from "./view-switch";

export const metadata: Metadata = {
  title: "Products — RALLA",
};

const th = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

const SORT_KEYS = ["stock", "price"] as const;
type SortKey = (typeof SORT_KEYS)[number];

/** `?sort=stock` is ascending, `?sort=-stock` descending; anything else is unsorted. */
function parseSort(raw: unknown): { key: SortKey; desc: boolean } | null {
  if (typeof raw !== "string") return null;
  const desc = raw.startsWith("-");
  const key = desc ? raw.slice(1) : raw;
  return (SORT_KEYS as readonly string[]).includes(key)
    ? { key: key as SortKey, desc }
    : null;
}

/** A header that sorts by its column: ascending first, a second click flips it. */
function SortHead({
  label,
  column,
  sort,
  query,
  className = "",
}: {
  label: string;
  column: SortKey;
  sort: { key: SortKey; desc: boolean } | null;
  query: string;
  className?: string;
}) {
  const active = sort?.key === column;
  const next = active && !sort.desc ? `-${column}` : column;
  return (
    <TableHead
      className={`${th} ${className}`}
      aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"}
    >
      <Link
        href={productsHref({ query, view: "table", sort: next })}
        scroll={false}
        className={`inline-flex items-center gap-1 hover:text-foreground ${active ? "text-foreground" : ""}`}
      >
        {label}
        {active ? (
          <HugeiconsIcon
            icon={sort.desc ? ArrowDown01Icon : ArrowUp01Icon}
            size={12}
            strokeWidth={2.5}
          />
        ) : null}
      </Link>
    </TableHead>
  );
}

export default async function ProductsPage({
  searchParams,
}: PageProps<"/user/product">) {
  const { q, view: rawView, created, sort: rawSort } = await searchParams;
  const query = typeof q === "string" ? q : "";
  // Contact cards are the default; only `?view=table` selects the table.
  const view = rawView === "table" ? "table" : "contact";
  const sort = parseSort(rawSort);
  const products = await listProducts(query);
  // Sorted here, not in the query: the whole catalogue is already loaded, and
  // a stable sort keeps the store's active-then-name order among equal values.
  if (sort) {
    const dir = sort.desc ? -1 : 1;
    products.sort((a, b) => (a[sort.key] - b[sort.key]) * dir);
  }
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
                <SortHead label="Stock" column="stock" sort={sort} query={query} />
                <TableHead className={th}>Name</TableHead>
                <SortHead
                  label="Price"
                  column="price"
                  sort={sort}
                  query={query}
                  className="text-right"
                />
                <TableHead className={th}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const activity = PRODUCT_ACTIVITY[productActivity(p.isActive)];
                // Read-only: the whole row opens the same edit sheet as the
                // contact view, so there is one place a product is changed.
                return (
                  <ProductEditSheet
                    key={p.id}
                    product={p}
                    as="tr"
                    className={`cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none ${p.isActive ? "" : "opacity-60"}`}
                  >
                    <TableCell className="font-mono text-[11px] font-medium">{p.sku}</TableCell>
                    <TableCell className="numeric">{p.stock.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="numeric text-right">{formatKyat(p.price)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium ${activity.chip}`}
                      >
                        <span className={`size-1.5 rounded-full ${activity.dot}`} aria-hidden />
                        {activity.label}
                      </span>
                    </TableCell>
                  </ProductEditSheet>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
