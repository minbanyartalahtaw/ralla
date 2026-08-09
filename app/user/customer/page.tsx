import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  PlusSignIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { listCustomers } from "@/lib/customer-store";
import { formatTiktokHandle, initials } from "@/lib/customers";
import { formatDate } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Customers — RALLA",
};

export default async function CustomersPage() {
  const customers = await listCustomers();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="bg-linear-to-r from-foreground via-primary to-foreground bg-clip-text text-xl font-bold tracking-[0.2em] text-transparent uppercase">
          Customers
        </h1>
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
          // Rows, not a table. Nine columns needed 1100px, so on a phone the
          // list was clipped after the third one with nothing to scroll — and
          // address and note, the two widest columns, are only ever read on the
          // detail page anyway.
          <ul className="divide-y">
            {customers.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/user/customer/${c.code}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent"
                >
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
                    aria-hidden
                  >
                    {initials(c.name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{c.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {formatTiktokHandle(c.tiktokUsername)}
                      <span className="mx-1.5 text-muted-foreground/50">·</span>
                      <span className="numeric">{c.code}</span>
                    </p>
                    {/* Folded into the name block on a phone; its own column
                        from `sm`, where there is room to line them up. */}
                    <p className="truncate text-[11px] text-muted-foreground sm:hidden">
                      {c.city}
                      <span className="mx-1.5 text-muted-foreground/50">·</span>
                      <span className="numeric">{c.phone}</span>
                    </p>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-[11px] text-muted-foreground">
                      {c.city}
                    </p>
                    <p className="numeric text-[11px] text-muted-foreground">
                      {c.phone}
                    </p>
                  </div>

                  {/* No "Added" label: a YYYY-MM-DD date needs no naming, and
                      repeating the word down every row was the only thing on
                      the list that read as leftover table chrome. */}
                  <div className="hidden shrink-0 text-right lg:block">
                    <p className="numeric text-[11px] text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </p>
                  </div>

                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    strokeWidth={2}
                    className="shrink-0 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
