import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Search01Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <h1 className="sr-only">Customers</h1>

      {/* The toolbar doesn't depend on the query — it renders for real, so
          "Add customer" is clickable immediately instead of waiting on the list. */}
      <div className="flex items-center gap-3">
        <InputGroup className="max-w-xs">
          <InputGroupInput
            placeholder="Name, @handle, RLC- code or phone"
            aria-label="Search customers by name, TikTok handle, customer code or phone"
            disabled
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="sm" variant="ghost" disabled>
              <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
              Search
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>

        <Button nativeButton={false} render={<Link href="/user/customer/new" />}>
          <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />
        </Button>
      </div>

      <div className="mt-4 rounded-lg border bg-card">
        <ul className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton
                className="size-9 shrink-0 rounded-full"
                style={{ animationDelay: `${i * 70}ms` }}
              />

              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton
                  className="h-3 w-32"
                  style={{ animationDelay: `${i * 70}ms` }}
                />
                <Skeleton
                  className="h-3 w-40"
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              </div>

              <div className="hidden shrink-0 space-y-1.5 text-right sm:block">
                <Skeleton
                  className="ml-auto h-3 w-14"
                  style={{ animationDelay: `${i * 70}ms` }}
                />
                <Skeleton
                  className="ml-auto h-3 w-20"
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              </div>

              <div className="hidden shrink-0 text-right lg:block">
                <Skeleton
                  className="h-3 w-16"
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              </div>

              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={14}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground"
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
