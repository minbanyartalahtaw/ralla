import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Package02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listProducts } from "@/lib/product-store";
import { formatDate, formatKyat } from "@/lib/orders";

import { ActiveSelect } from "./active-select";
import { StockCell } from "./stock-cell";

export const metadata: Metadata = {
  title: "Products — RALLA",
};

const th = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

export default async function ProductsPage() {
  const products = await listProducts();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-xl font-bold tracking-[0.2em] text-transparent uppercase">
          Product
        </h1>
        <Button nativeButton={false} render={<Link href="/user/product/new" />}>
          <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
          New product
        </Button>
      </div>

      <div className="mt-6 rounded-lg border bg-card">
        {products.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="text-muted-foreground">
              <HugeiconsIcon icon={Package02Icon} size={32} strokeWidth={1.5} />
            </span>
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
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="numeric text-right font-medium">
                    {formatKyat(p.price)}
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
