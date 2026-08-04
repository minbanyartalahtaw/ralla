import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, UserGroupIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listCustomers } from "@/lib/customer-store";
import { formatTiktokHandle } from "@/lib/customers";
import { formatDate } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Customers — RALLA",
};

const th = "text-[11px] font-semibold tracking-wide text-muted-foreground uppercase";

export default async function CustomersPage() {
  const customers = await listCustomers();

  return (
    <div>
      <div className="flex items-center justify-end gap-4">
        <Button nativeButton={false} render={<Link href="/user/customer/new" />}>
          <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
          New customer
        </Button>
      </div>

      <div className="mt-6 rounded-lg border bg-card">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="text-muted-foreground">
              <HugeiconsIcon icon={UserGroupIcon} size={32} strokeWidth={1.5} />
            </span>
            <p className="mt-3 text-xs font-medium">No customers yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Add one and their details will fill in automatically on new
              orders.
            </p>
            <Button
              variant="outline"
              nativeButton={false}
              className="mt-4"
              render={<Link href="/user/customer/new" />}
            >
              Add a customer
            </Button>
          </div>
        ) : (
          <Table className="min-w-[1020px]">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className={th}>Customer ID</TableHead>
                <TableHead className={th}>TikTok</TableHead>
                <TableHead className={th}>Name</TableHead>
                <TableHead className={th}>Mobile</TableHead>
                <TableHead className={th}>City</TableHead>
                <TableHead className={th}>Address</TableHead>
                <TableHead className={th}>Added</TableHead>
                <TableHead className={th}>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  {/* The permanent identity. A TikTok handle can be renamed;
                      this can't, so it leads the row. */}
                  <TableCell>
                    <span className="numeric font-mono text-[11px] font-medium">
                      {c.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {formatTiktokHandle(c.tiktokUsername)}
                    </div>
                    {c.tiktokName ? (
                      <div className="truncate text-[11px]" title={c.tiktokName}>
                        {c.tiktokName}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="numeric text-muted-foreground">
                    {c.phone}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.city}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div
                      className="truncate text-muted-foreground"
                      title={c.address}
                    >
                      {c.address}
                    </div>
                  </TableCell>
                  <TableCell className="numeric text-muted-foreground">
                    {formatDate(c.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    {c.note ? (
                      <div
                        className="truncate text-muted-foreground"
                        title={c.note}
                      >
                        {c.note}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
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
