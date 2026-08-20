"use client";

import * as React from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { isValidSku, normalizeSku } from "@/lib/products";

import { setProductSkuAction } from "./actions";

/**
 * Product SKU, editable in place — same save-on-blur/Enter, Escape-reverts
 * behavior as StockCell and PriceCell.
 *
 * The typed text is normalized (uppercased, spaces collapsed to dashes)
 * before it's compared or saved, matching the create form, so `lip-vm-01`
 * and `LIP-VM-01` never end up as two different products.
 *
 * A collision with another product's SKU is a real, everyday mistake here —
 * unlike stock and price, it can't be ruled out client-side — so the action
 * reports it as returned data rather than a thrown error, which Next.js
 * would otherwise redact to a generic message in production.
 */
export function SkuCell({ productId, sku }: { productId: number; sku: string }) {
  const [pending, startTransition] = React.useTransition();
  const [draft, setDraft] = React.useState(sku);
  const [invalid, setInvalid] = React.useState(false);

  // Adopt the server value whenever it changes underneath us — a revalidate
  // after someone else's edit, or after our own save lands.
  const [lastSku, setLastSku] = React.useState(sku);
  if (sku !== lastSku) {
    setLastSku(sku);
    setDraft(sku);
    setInvalid(false);
  }

  function commit() {
    const next = normalizeSku(draft);
    if (!isValidSku(next)) {
      // Keep the typed text rather than silently reverting: the field stays
      // marked unsaved, so a typo is visible instead of vanishing.
      setInvalid(true);
      return;
    }

    setInvalid(false);
    setDraft(next);
    if (next === sku) return;

    startTransition(async () => {
      const data = new FormData();
      data.set("id", String(productId));
      data.set("sku", next);
      const result = await setProductSkuAction(data);
      if (result.error) {
        toast.error(result.error);
        setInvalid(true);
        return;
      }
      toast.success(`SKU updated to ${next}.`);
    });
  }

  function reset() {
    setDraft(sku);
    setInvalid(false);
  }

  return (
    <Input
      aria-label="SKU"
      aria-invalid={invalid || undefined}
      title={
        invalid
          ? "Not saved — letters, numbers and dashes only, 2–24 characters."
          : undefined
      }
      disabled={pending}
      value={draft}
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
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
      className="w-32 font-mono text-[11px] font-medium"
    />
  );
}
