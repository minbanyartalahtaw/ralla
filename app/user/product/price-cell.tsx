"use client";

import * as React from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { parsePrice } from "@/lib/products";

import { setProductPriceAction } from "./actions";

/**
 * List price, editable in place — the twin of StockCell, and it behaves the
 * same way on purpose: saves on blur or Enter, Escape puts the server value
 * back, and the typed number stays on screen while the save is in flight.
 *
 * The one deliberate difference is what an empty field means. A blank stock is
 * "none on hand" and saves as 0; a blank price is not a price at all, so it is
 * refused and the cell stays marked unsaved rather than storing a free product.
 *
 * Editing here changes the catalog only. Past orders keep the price they were
 * sold at, because each order line snapshots its own.
 */
export function PriceCell({
  productId,
  sku,
  price,
}: {
  productId: number;
  sku: string;
  price: number;
}) {
  const [pending, startTransition] = React.useTransition();
  const [draft, setDraft] = React.useState(String(price));
  const [invalid, setInvalid] = React.useState(false);

  // Adopt the server value whenever it changes underneath us — a revalidate
  // after someone else's edit, or after our own save lands.
  const [lastPrice, setLastPrice] = React.useState(price);
  if (price !== lastPrice) {
    setLastPrice(price);
    setDraft(String(price));
    setInvalid(false);
  }

  function commit() {
    const next = parsePrice(draft);
    if (next === null) {
      // Keep the typed text rather than silently reverting: the field stays
      // marked unsaved, so a typo is visible instead of vanishing.
      setInvalid(true);
      return;
    }

    setInvalid(false);
    setDraft(String(next));
    if (next === price) return;

    startTransition(async () => {
      const data = new FormData();
      data.set("id", String(productId));
      data.set("price", String(next));
      try {
        await setProductPriceAction(data);
        toast.success(`${sku} price updated to ${next} Ks.`);
      } catch {
        toast.error(`Couldn't update ${sku} price. Try again.`);
        setDraft(String(price));
      }
    });
  }

  function reset() {
    setDraft(String(price));
    setInvalid(false);
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Input
        inputMode="numeric"
        aria-label="List price in kyats"
        aria-invalid={invalid || undefined}
        title={invalid ? "Not saved — whole kyats only, at least 1." : undefined}
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
        className="numeric w-24 text-right"
      />
      {/* The column header says Price, but the unit belongs next to the number
          — the input can't carry the `Ks` that formatKyat() used to print. */}
      <span className="text-[11px] text-muted-foreground">Ks</span>
    </div>
  );
}
