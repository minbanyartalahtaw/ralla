"use client";

import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";

/**
 * Goes back the way you came. Most detail and create pages have more than one
 * way in — an order is opened from the orders list, from a customer's history,
 * or from a pasted link — so a hard-coded href sends some arrivals somewhere
 * they never were.
 *
 * `fallback` is where to go when there is no history to return to, and should
 * be the list this page belongs to.
 *
 * `history.length` counts the whole tab, not just this app, so it can't prove
 * the previous entry was ours — it only proves there is one. A fresh tab opened
 * straight onto the URL has a length of 1, which is the case that matters: that
 * one falls through to `fallback` instead of a dead click.
 */
export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label="Go back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} />
    </Button>
  );
}
