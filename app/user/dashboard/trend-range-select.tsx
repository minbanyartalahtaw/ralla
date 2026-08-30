"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  DEFAULT_TREND_RANGE,
  TREND_RANGES,
  trendRange,
  type TrendRange,
} from "./trend-range";

/**
 * The window picker that sits where each trend panel's caption used to.
 *
 * The choice lives in the URL rather than in component state: the data behind
 * it is fetched on the server, so the server has to know it, and a dashboard
 * someone is looking at stays a link they can send.
 *
 * Each panel carries its own parameter. The two charts sit side by side, and
 * one dropdown silently moving the other panel is worse than two dropdowns.
 */
export function TrendRangeSelect({
  param,
  value,
  panel,
}: {
  /** The search parameter this panel owns. */
  param: "revenue" | "orders";
  value: TrendRange;
  /** The panel's heading, so the button reads as its own control aloud. */
  panel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  function select(next: TrendRange) {
    if (next === value) return;

    const params = new URLSearchParams(searchParams.toString());
    // The default stays out of the URL, so a shared link carries only what was
    // actually changed.
    if (next === DEFAULT_TREND_RANGE) params.delete(param);
    else params.set(param, next);

    const qs = params.toString();
    startTransition(() => {
      // replace, not push: a window is a way of looking at the page, not a
      // place. Back should leave the dashboard, not walk every window tried.
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // Pulled flush with the panel's right padding so the label still lines
        // up with the caption it replaced.
        className="-mr-1.5 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-popup-open:bg-accent data-popup-open:text-accent-foreground data-pending:opacity-60"
        aria-label={`${panel} — ${trendRange(value).label}`}
        data-pending={pending || undefined}
      >
        {trendRange(value).label}
        <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-36">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next: string) => select(next as TrendRange)}
        >
          {TREND_RANGES.map((range) => (
            <DropdownMenuRadioItem
              key={range.value}
              value={range.value}
              closeOnClick
            >
              {range.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
