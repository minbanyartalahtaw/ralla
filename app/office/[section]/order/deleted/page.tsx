import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";

import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAbility } from "@/lib/auth";
import { listDeletedOrders } from "@/lib/order-store";
import { formatDateTime, formatKyat, itemCount } from "@/lib/orders";
import { adminSectionOnly } from "@/app/office/[section]/_components/section";

import { restoreOrderAction } from "../actions";

export const metadata: Metadata = {
  title: "Deleted orders — RALLA",
};

const th = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

/**
 * Admin only. Styled like the orders table. Restoring takes no stock off the
 * shelf, because deleting put none back (docs/role.md, decision B).
 */
export default async function DeletedOrdersPage({
  params,
}: PageProps<"/office/[section]/order/deleted">) {
  await requireAbility("viewDeletedOrders");
  await adminSectionOnly(params);
  const orders = await listDeletedOrders();

  return (
    <div>
      <h1 className="sr-only">Deleted orders</h1>
      <div className="flex items-center gap-3">
        <BackButton fallback="/office/admin/order" />
        <p className="text-xs text-muted-foreground">
          {orders.length} deleted {orders.length === 1 ? "order" : "orders"} · hidden from every
          list, count and total until restored
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="text-muted-foreground">
              <HugeiconsIcon icon={Delete02Icon} size={32} strokeWidth={1.5} />
            </span>
            <p className="mt-3 text-xs font-medium">No deleted orders</p>
          </div>
        ) : (
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className={th}>Order</TableHead>
                <TableHead className={th}>Customer</TableHead>
                <TableHead className={th}>Items</TableHead>
                <TableHead className={`${th} text-right`}>Total</TableHead>
                <TableHead className={th}>Deleted</TableHead>
                <TableHead className={th}>
                  <span className="sr-only">Restore</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="numeric font-mono text-[11px] font-medium">
                    {o.code}
                  </TableCell>
                  <TableCell className="font-medium">{o.customerName}</TableCell>
                  <TableCell className="numeric text-muted-foreground">
                    {itemCount(o.items)}
                  </TableCell>
                  <TableCell className="numeric text-right">{formatKyat(o.total)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="numeric">
                      {o.deletedAt ? formatDateTime(o.deletedAt) : ""}
                    </span>
                    <span className="block text-[11px]">
                      by {o.deletedBy?.name ?? "a removed account"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={restoreOrderAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        Restore
                      </Button>
                    </form>
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
