"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import type { Product } from "@/lib/product-store";
import { formatKyat } from "@/lib/orders";

export type Line = {
  /** Stable across re-renders so React keys don't reshuffle rows on delete. */
  key: string;
  productId: number | null;
  name: string;
  unitPrice: string;
  quantity: string;
};

let nextKey = 0;
export function blankLine(): Line {
  nextKey += 1;
  return {
    key: `line-${nextKey}`,
    productId: null,
    name: "",
    unitPrice: "",
    quantity: "1",
  };
}

/** Whole kyats only — reject anything else rather than silently rounding. */
function toWholeNumber(raw: string): number | null {
  const text = raw.trim().replace(/,/g, "");
  if (!/^\d+$/.test(text)) return null;
  const n = Number.parseInt(text, 10);
  return Number.isSafeInteger(n) ? n : null;
}

export function lineAmount(line: Line): number | null {
  const price = toWholeNumber(line.unitPrice);
  const qty = toWholeNumber(line.quantity);
  if (price === null || qty === null || qty < 1) return null;
  return price * qty;
}

export function linesTotal(lines: Line[]): number {
  return lines.reduce((sum, line) => sum + (lineAmount(line) ?? 0), 0);
}

/**
 * Editable order lines.
 *
 * The order total is computed from these rows and never typed, so the stored
 * total can't disagree with what it's made of. Picking a catalog product fills
 * the name and price but both stay editable — a one-off discount shouldn't
 * require changing the product.
 */
export function OrderLines({
  products,
  lines,
  onChange,
  error,
}: {
  products: Product[];
  lines: Line[];
  onChange: (lines: Line[]) => void;
  error?: string;
}) {
  const byId = React.useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  function update(key: string, patch: Partial<Line>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickProduct(key: string, value: string) {
    if (value === "") {
      update(key, { productId: null });
      return;
    }
    const product = byId.get(Number(value));
    if (!product) return;
    update(key, {
      productId: product.id,
      name: product.name,
      unitPrice: String(product.price),
    });
  }

  const total = linesTotal(lines);

  return (
    <div>
      {/* Header row: only useful once there's width for it. */}
      <div className="hidden gap-2 px-1 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:grid sm:grid-cols-[1fr_5rem_8rem_2rem]">
        <span>Product</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="sr-only">Remove</span>
      </div>

      <ul className="space-y-2">
        {lines.map((line) => {
          const amount = lineAmount(line);
          return (
            <li
              key={line.key}
              className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_5rem_8rem_2rem] sm:items-start sm:rounded-none sm:border-0 sm:p-0"
            >
              <div className="grid gap-1">
                <select
                  aria-label="Catalog product"
                  className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                  value={line.productId ?? ""}
                  onChange={(e) => pickProduct(line.key, e.target.value)}
                >
                  <option value="">Custom item…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatKyat(p.price)}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label="Item name"
                  placeholder="Item name"
                  value={line.name}
                  onChange={(e) =>
                    // Typing over the name detaches it from the catalog entry,
                    // so reporting never credits a sale to the wrong product.
                    update(line.key, {
                      name: e.target.value,
                      productId: null,
                    })
                  }
                />
              </div>

              <Input
                aria-label="Quantity"
                inputMode="numeric"
                className="numeric"
                value={line.quantity}
                onChange={(e) => update(line.key, { quantity: e.target.value })}
              />

              <div>
                <InputGroup>
                  <InputGroupInput
                    aria-label="Unit price"
                    inputMode="numeric"
                    className="numeric"
                    value={line.unitPrice}
                    onChange={(e) =>
                      update(line.key, { unitPrice: e.target.value })
                    }
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>Ks</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                <p className="numeric mt-1 text-right text-[11px] text-muted-foreground">
                  {amount === null ? "—" : formatKyat(amount)}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove line"
                // Never leave the form with zero lines — an order must have one.
                disabled={lines.length === 1}
                onClick={() =>
                  onChange(lines.filter((l) => l.key !== line.key))
                }
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...lines, blankLine()])}
        >
          <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
          Add line
        </Button>
        <div className="text-right">
          <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
            Total
          </span>
          <p className="numeric text-sm font-semibold">{formatKyat(total)}</p>
        </div>
      </div>

      {error ? (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-destructive">
          <HugeiconsIcon icon={Alert02Icon} size={12} strokeWidth={2} />
          {error}
        </p>
      ) : null}
    </div>
  );
}
