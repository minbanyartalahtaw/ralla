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
  /**
   * React list key only — never rendered into the DOM.
   *
   * The sequence number is owned by the form (a ref), not a module-level
   * counter. A module counter kept climbing across requests on the server
   * while a fresh client started from zero, and Fast Refresh reset it mid
   * session — which produced both a hydration mismatch and duplicate keys.
   */
  key: string;
  /** Null only before a product is chosen — every saved line has one. */
  productId: number | null;
  /** Prefilled from the product, then editable for a one-off discount. */
  unitPrice: string;
  quantity: string;
};

/** `seq` must be unique within the form; the caller owns the sequence. */
export function blankLine(seq: number): Line {
  return {
    key: `line-${seq}`,
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
  onAdd,
  error,
}: {
  products: Product[];
  lines: Line[];
  onChange: (lines: Line[]) => void;
  onAdd: () => void;
  error?: string;
}) {
  const byId = React.useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  // Stable across the server/client boundary, unlike the module counter that
  // produces `line.key`.
  const fieldId = React.useId();

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

  /**
   * How far past the counted stock this line goes, or null when it fits.
   *
   * A warning, not an error: the count is maintained by hand, so staff may well
   * know a restock is on the way. Saving is never blocked, and the order takes
   * the stock down to zero rather than negative.
   */
  function overStock(line: Line): { stock: number; quantity: number } | null {
    const product = chosen(line);
    const quantity = toWholeNumber(line.quantity);
    if (!product || quantity === null) return null;
    return quantity > product.stock ? { stock: product.stock, quantity } : null;
  }

  // One row per line at every width — stacking the four fields into a card on
  // small screens turned a three-line order into a screen full of boxes.
  //
  // A phone gives this row about 280px once the page and card padding are
  // taken out, so the three fixed columns are cut to what their content
  // actually needs (2–3 digits, 5–6 digits, one icon) and every pixel left
  // goes to the product name, which is the only field that can't be guessed
  // from a glance at its value.
  const columns =
    "grid grid-cols-[minmax(0,1fr)_2.75rem_5rem_1.5rem] gap-1.5 sm:grid-cols-[1fr_5rem_8rem_2rem] sm:gap-2";

  return (
    <div>
      {/* Shown on mobile too: with the fields on one row, these labels are the
          only thing naming them. */}
      <div
        className={`${columns} px-1 pb-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase`}
      >
        <span>Product</span>
        <span>Qty</span>
        <span>Unit price</span>
        <span className="sr-only">Remove</span>
      </div>

      <ul className="space-y-2">
        {lines.map((line, index) => {
          const short = overStock(line);
          return (
            <li key={line.key} className={`${columns} items-start`}>
              <Combobox
                items={products}
                value={chosen(line)}
                onValueChange={(p: Product | null) => pickProduct(line.key, p)}
                // Selected state shows the name alone; the price is already in
                // its own column by then.
                itemToStringLabel={(p: Product) => p.name}
              >
                <ComboboxInput
                  id={`${fieldId}-line-${index}-product`}
                  aria-label="Product"
                  // Short enough not to be clipped in the narrow mobile column.
                  placeholder="Search"
                />
                <ComboboxContent>
                  <ComboboxEmpty>
                    No product matches. Add it on the Products page first.
                  </ComboboxEmpty>
                  <ComboboxList>
                    {/* Name, then its price, with stock pushed to the far edge —
                      the counts line up down the list instead of drifting with
                      the name lengths. Sold-out products stay selectable: the
                      count is kept by hand, so the line warns instead of
                      blocking an order staff know they can fill. */}
                    {products.map((p) => (
                      <ComboboxItem key={p.id} value={p} className="pr-8">
                        <span className="flex min-w-0 flex-1 items-baseline gap-3">
                          <span className="truncate">{p.name}</span>
                          <span className="numeric shrink-0 text-[11px] text-muted-foreground">
                            {formatKyat(p.price)}
                          </span>
                          <span
                            className={`ml-auto shrink-0 text-[11px] ${
                              p.stock === 0
                                ? "text-cancelled"
                                : "numeric text-muted-foreground"
                            }`}
                          >
                            {p.stock === 0 ? "Out of stock" : `${p.stock} left`}
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
                {/* The unit is worth ~28px of a 5rem column on a phone, and the
                  column header already says Unit price — every amount in this
                  app is kyats. */}
                <InputGroupAddon align="inline-end" className="hidden sm:flex">
                  <InputGroupText>Ks</InputGroupText>
                </InputGroupAddon>
              </InputGroup>

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

              {short ? (
                <p className="col-span-full flex items-center gap-1 px-1 text-[11px] text-shipped">
                  <HugeiconsIcon
                    icon={Alert02Icon}
                    size={12}
                    strokeWidth={2}
                    className="shrink-0"
                  />
                  Only {short.stock} in stock, ordering {short.quantity}.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
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
