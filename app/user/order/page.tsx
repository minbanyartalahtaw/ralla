import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, TruckDeliveryIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listOrders } from "@/lib/order-store";
import {
  DELIVERY_STATUS,
  PAYMENT_METHOD,
  formatDate,
  formatKyat,
  itemCount,
  type DeliveryStatus,
} from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders — RALLA",
};

const th = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

function StatusChip({ status }: { status: DeliveryStatus }) {
  const s = DELIVERY_STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium ${s.chip}`}
    >
      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

export default async function OrdersPage() {
  const orders = await listOrders();

  return (
    <div>
      <div className="flex items-center justify-end gap-4">
        <Button nativeButton={false} render={<Link href="/user/order/new" />}>
          <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
          New order
        </Button>
      </div>

      <div className="mt-6 rounded-lg border bg-card">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="text-muted-foreground">
              <HugeiconsIcon
                icon={TruckDeliveryIcon}
                size={32}
                strokeWidth={1.5}
              />
            </span>
            <p className="mt-3 text-xs font-medium">No orders yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Orders you save will appear here, newest first.
            </p>
            <Button
              variant="outline"
              nativeButton={false}
              className="mt-4"
              render={<Link href="/user/order/new" />}
            >
              Add an order
            </Button>
          </div>
        ) : (
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className={th}>Order</TableHead>
                <TableHead className={th}>Customer</TableHead>
                <TableHead className={th}>Items</TableHead>
                <TableHead className={`${th} text-right`}>Total</TableHead>
                <TableHead className={th}>Payment</TableHead>
                <TableHead className={th}>Delivery</TableHead>
                <TableHead className={th}>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <span className="numeric font-mono text-[11px] font-medium">
                      {o.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{o.customerName}</div>
                    <div className="numeric text-[11px] text-muted-foreground">
                      {o.phone} · {o.city}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <div
                      className="truncate text-muted-foreground"
                      title={o.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                    >
                      {o.items.map((i) => i.name).join(", ")}
                    </div>
                    <div className="numeric text-[11px] text-muted-foreground">
                      {itemCount(o.items)} items
                    </div>
                  </TableCell>
                  <TableCell className="numeric text-right font-medium">
                    {formatKyat(o.total)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        o.paymentMethod === "refunded"
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      {PAYMENT_METHOD[o.paymentMethod]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={o.status} />
                  </TableCell>
                  <TableCell className="numeric text-muted-foreground">
                    {formatDate(o.placedAt)}
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
