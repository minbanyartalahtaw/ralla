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

import { StatusSelect } from "./status-select";
import {
  PAYMENT_METHOD,
  formatDate,
  formatKyat,
  itemCount,
} from "@/lib/orders";

export const metadata: Metadata = {
  title: "Orders — RALLA",
};

const th = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

export default async function OrdersPage() {
  const orders = await listOrders();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-xl font-bold tracking-[0.2em] text-transparent uppercase">
          Orders
        </h1>
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
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className={th}>Order</TableHead>
                <TableHead className={th}>Customer</TableHead>
                <TableHead className={th}>Phone</TableHead>
                <TableHead className={th}>City</TableHead>
                <TableHead className={th}>Items</TableHead>
                <TableHead className={`${th} text-right`}>Total</TableHead>
                <TableHead className={th}>Payment</TableHead>
                <TableHead className={th}>Date</TableHead>
                <TableHead className={th}>Delivery</TableHead>
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
                  <TableCell className="font-medium">{o.customerName}</TableCell>
                  <TableCell className="numeric text-muted-foreground">
                    {o.phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {o.city}
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
                                    <TableCell className="numeric text-muted-foreground">
                    {formatDate(o.placedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusSelect orderId={o.id} status={o.status} />
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
