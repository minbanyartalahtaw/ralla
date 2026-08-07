"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PRODUCT_ACTIVITY,
  PRODUCT_ACTIVITY_KEYS,
  productActivity,
  type ProductActivity,
} from "@/lib/products";

import { toggleProductActiveAction } from "./actions";

/**
 * The active/discontinued chip, clickable to change it.
 *
 * Mirrors the orders table's StatusSelect: `useTransition` plus an optimistic
 * value so the row updates on click instead of sitting unchanged for a round
 * trip, which reads as a dead button and gets clicked twice.
 */
export function ActiveSelect({
  productId,
  isActive,
}: {
  productId: number;
  isActive: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [optimistic, setOptimistic] = React.useState<ProductActivity | null>(
    null,
  );

  const current = productActivity(isActive);
  const shown = optimistic ?? current;
  const meta = PRODUCT_ACTIVITY[shown];

  function choose(next: ProductActivity) {
    setOpen(false);
    if (next === current) return;

    setOptimistic(next);
    startTransition(async () => {
      const data = new FormData();
      data.set("id", String(productId));
      data.set("isActive", String(next === "active"));
      try {
        await toggleProductActiveAction(data);
      } finally {
        // Drop the optimistic value either way: on success the revalidated
        // server data now says the same thing, and on failure the row should
        // snap back to the truth rather than lie.
        setOptimistic(null);
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={pending}
            aria-label={`Status: ${meta.label}. Change it.`}
            className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-60 ${meta.chip}`}
          />
        }
      >
        <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden />
        {meta.label}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={10}
          strokeWidth={2.5}
          className="opacity-60"
        />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-52 p-1">
        <ul>
          {PRODUCT_ACTIVITY_KEYS.map((key) => {
            const item = PRODUCT_ACTIVITY[key];
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => choose(key)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
                >
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${item.dot}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  {key === current ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      size={14}
                      strokeWidth={2}
                      className="shrink-0 text-muted-foreground"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
