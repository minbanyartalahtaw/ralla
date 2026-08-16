"use client";

import * as React from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { parseStock } from "@/lib/products";

import { setProductStockAction } from "./actions";

/**
 * What the typed text counts as. A cleared field means none on hand. Stock is a
 * count, so its empty value is 0 — the cell must never be left blank, because a
 * blank reads as "unknown" when the answer is actually "none".
 *
 * Null still means unreadable (a decimal, a stray letter), which is a mistake
 * worth surfacing rather than quietly turning into a number.
 */
function readDraft(text: string): number | null {
  return text.trim() === "" ? 0 : parseStock(text);
}

/**
 * Units on hand, editable in place.
 *
 * There is no product edit page, and stock is the one product field that
 * changes weekly — routing a shelf recount through a separate form would make
 * the number stale the moment it is shown. Saves on blur or Enter; Escape puts
 * the server value back.
 *
 * Like ActiveSelect, the typed value is shown optimistically rather than
 * waiting for the revalidate, so a corrected count doesn't visibly snap back to
 * the old number for a round trip.
 */
export function StockCell({
  productId,
  sku,
  stock,
}: {
  productId: number;
  sku: string;
  stock: number;
}) {
  const [pending, startTransition] = React.useTransition();
  const [draft, setDraft] = React.useState(String(stock));
  const [invalid, setInvalid] = React.useState(false);

  // Adopt the server value whenever it changes underneath us — a revalidate
  // after someone else's edit, or after our own save lands.
  const [lastStock, setLastStock] = React.useState(stock);
  if (stock !== lastStock) {
    setLastStock(stock);
    setDraft(String(stock));
    setInvalid(false);
  }

  function commit() {
    const next = readDraft(draft);
    if (next === null) {
      // Keep the typed text rather than silently reverting: the field stays
      // marked unsaved, so a typo is visible instead of vanishing.
      setInvalid(true);
      return;
    }

    setInvalid(false);
    setDraft(String(next));
    if (next === stock) return;

    startTransition(async () => {
      const data = new FormData();
      data.set("id", String(productId));
      data.set("stock", String(next));
      try {
        await setProductStockAction(data);
        toast.success(`${sku} stock updated to ${next}.`);
      } catch {
        toast.error(`Couldn't update ${sku} stock. Try again.`);
        setDraft(String(stock));
      }
    });
  }

  function reset() {
    setDraft(String(stock));
    setInvalid(false);
  }



  return (
    <div className="flex items-center gap-2">
      <Input
        inputMode="numeric"
        aria-label="Units in stock"
        aria-invalid={invalid || undefined}
        title={invalid ? "Not saved — whole units only, 0 or more." : undefined}
        disabled={pending}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            reset();
          }
        }}
        className="numeric w-16 text-right"
      />
    </div>
  );
}
