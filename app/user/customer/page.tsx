import Link from "next/link";
import type { Metadata } from "next";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Search01Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { CreatedToast } from "@/components/created-toast";
import { CustomerAvatar } from "@/components/customer-avatar";
import { Highlight } from "@/components/highlight";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { listCustomers, normalizeCustomerQuery } from "@/lib/customer-store";
import { formatTiktokHandle } from "@/lib/customers";
import { formatDate } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Customers — RALLA",
};

export default async function CustomersPage({
  searchParams,
}: PageProps<"/user/customer">) {
  const { q, created } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const customers = await listCustomers(query);
  const createdCode = typeof created === "string" ? created : undefined;

  const searched = normalizeCustomerQuery(query);
  const searching = searched !== "";
  // The handle is stored without one, so the `@` has to come off before it can
  // be matched against what's on screen.
  const handleQuery = searched.replace(/^@+/, "");

  return (
    <div>
      {/* The visible heading is gone — the breadcrumb already names the page.
          This keeps a top-level heading for screen readers. */}
      <h1 className="sr-only">Customers</h1>

      <CreatedToast
        code={createdCode}
        message={createdCode ? `Customer ${createdCode} added.` : ""}
        detailHref={createdCode ? `/user/customer/${createdCode}` : undefined}
      />

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
              placeholder="Name, @handle, RLC- code or phone"
              aria-label="Search customers by name, TikTok handle, customer code or phone"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
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
                  render={<Link href="/user/customer" />}
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

        <Button nativeButton={false} render={<Link href="/user/customer/new" />}>
          <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />
          
        </Button>
      </div>

      <div className="mt-4 rounded-lg border bg-card">
        {customers.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="text-muted-foreground">
              <HugeiconsIcon
                icon={searching ? Search01Icon : UserGroupIcon}
                size={32}
                strokeWidth={1.5}
              />
            </span>
            {searching ? (
              <>
                <p className="mt-3 text-xs font-medium">No customer matches</p>
                <p className="mt-1 text-xs text-muted-foreground">{searched}</p>
                <Button
                  variant="outline"
                  nativeButton={false}
                  className="mt-4"
                  render={<Link href="/user/customer" />}
                >
                  Show all customers
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
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
                  <CustomerAvatar
                    customer={c}
                    className="size-9 text-[11px]"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      <Highlight text={c.name} query={searched} />
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {/* Matched without the `@`, which is display only — the
                          handle is stored bare. */}
                      <Highlight
                        text={formatTiktokHandle(c.tiktokUsername)}
                        query={handleQuery}
                      />
                      <span className="mx-1.5 text-muted-foreground/50">·</span>
                      <span className="numeric">
                        <Highlight text={c.code} query={searched} />
                      </span>
                    </p>
                    {/* Folded into the name block on a phone; its own column
                        from `sm`, where there is room to line them up. */}
                    <p className="truncate text-[11px] text-muted-foreground sm:hidden">
                      {c.city}
                      <span className="mx-1.5 text-muted-foreground/50">·</span>
                      <span className="numeric">
                        <Highlight text={c.phone} query={searched} digits />
                      </span>
                    </p>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-[11px] text-muted-foreground">
                      {c.city}
                    </p>
                    <p className="numeric text-[11px] text-muted-foreground">
                      <Highlight text={c.phone} query={searched} digits />
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
