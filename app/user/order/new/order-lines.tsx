"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  Delete02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { formatKyat } from "@/lib/orders";
import type { Product } from "@/lib/products";

export type Line = {
  /** Stable across re-renders so React keys don't reshuffle rows on delete. */
  key: string;
  /** Null only before a product is chosen — every saved line has one. */
  productId: number | null;
  /** Prefilled from the product, then editable for a one-off discount. */
  unitPrice: string;
  quantity: string;
};

let nextKey = 0;
export function blankLine(): Line {
  nextKey += 1;
  return {
    key: `line-${nextKey}`,
    productId: null,
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
  if (line.productId === null) return null;
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
 * Every line is a catalog product — there is no free-text item, so a typo can
 * never invent a product that reporting then has to account for. Add it on the
 * Products page first.
 *
 * The order total is computed from these rows and never typed, so the stored
 * total can't disagree with what it's made of.
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

  function pickProduct(key: string, product: Product | null) {
    if (!product) {
      update(key, { productId: null, unitPrice: "" });
      return;
    }
    // Price comes from the catalog, then stays editable for a discount.
    update(key, { productId: product.id, unitPrice: String(product.price) });
  }

  const total = linesTotal(lines);
  const chosen = (line: Line) =>
    line.productId === null ? null : (byId.get(line.productId) ?? null);

  return (
    <div>
      <div className="hidden gap-2 px-1 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase sm:grid sm:grid-cols-[1fr_5rem_8rem_2rem]">
        <span>Product</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="sr-only">Remove</span>
      </div>

      <ul className="space-y-2">
        {lines.map((line) => (
          <li
            key={line.key}
            className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_5rem_8rem_2rem] sm:items-start sm:rounded-none sm:border-0 sm:p-0"
          >
            <Combobox
              items={products}
              value={chosen(line)}
              onValueChange={(p: Product | null) => pickProduct(line.key, p)}
              // Selected state shows the name alone; the price is already in
              // its own column by then.
              itemToStringLabel={(p: Product) => p.name}
            >
              <ComboboxInput
                id={`${line.key}-product`}
                aria-label="Product"
                placeholder="Search a product"
              />
              <ComboboxContent>
                <ComboboxEmpty>
                  No product matches. Add it on the Products page first.
                </ComboboxEmpty>
                <ComboboxList>
                  {products.map((p) => (
                    <ComboboxItem key={p.id} value={p} className="pr-8">
                      <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                        <span className="truncate">{p.name}</span>
                        <span className="numeric shrink-0 text-[11px] text-muted-foreground">
                          {formatKyat(p.price)}
                        </span>
                      </span>
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>

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
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove line"
              // Never leave the form with zero lines — an order must have one.
              disabled={lines.length === 1}
              onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={1.5} />
            </Button>
          </li>
        ))}
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
