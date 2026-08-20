"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

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
 * Units asked for per product.
 *
 * Summed rather than read per line: the same product can sit on two rows, and
 * each on its own can fit on the shelf while the sum doesn't.
 */
function orderedByProduct(lines: Line[]): Map<number, number> {
  const totals = new Map<number, number>();
  for (const line of lines) {
    if (line.productId === null) continue;
    const quantity = toWholeNumber(line.quantity);
    if (quantity === null || quantity < 1) continue;
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + quantity);
  }
  return totals;
}

/**
 * Products the order asks for more of than the shelf holds. An order that would
 * oversell can't be saved, so the form asks this to decide whether the save
 * button is live — the action and the write transaction check it again.
 */
export function stockShortfalls(lines: Line[], products: Product[]) {
  const totals = orderedByProduct(lines);
  return products
    .filter((p) => (totals.get(p.id) ?? 0) > p.stock)
    .map((p) => ({ name: p.name, stock: p.stock, ordered: totals.get(p.id)! }));
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

  const ordered = React.useMemo(() => orderedByProduct(lines), [lines]);

  /**
   * How far past the counted stock this line's product goes, or null when it
   * fits. Blocking, not advisory — an order can't be saved for units that
   * aren't there.
   */
  function overStock(line: Line): { stock: number; ordered: number } | null {
    const product = chosen(line);
    if (!product) return null;
    const wanted = ordered.get(product.id) ?? 0;
    return wanted > product.stock
      ? { stock: product.stock, ordered: wanted }
      : null;
  }

  // One row per line at every width — stacking the four fields into a card on
  // small screens turned a three-line order into a screen full of boxes.
  //
  // A phone gives this row about 280px once the page and card padding are
  // taken out, so the three fixed columns are cut to what their content
  // actually needs (2–3 digits, 5–6 digits, one icon) and every pixel left
  // goes to the product name, which is the only field that can't be guessed
  // from a glance at its value.
  //
  // On a wide screen the product column is capped rather than left as 1fr: a
  // 430px-wide empty search box beside a 48px quantity looked unbalanced, and
  // no product name needs that much room.
  const columns =
    "grid grid-cols-[minmax(0,1fr)_2.75rem_5rem_1.5rem] gap-1.5 sm:grid-cols-[minmax(0,26rem)_6rem_10rem_2rem] sm:gap-3";

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
            <li key={line.key} className={`${columns} items-center`}>
              <Combobox
                items={products}
                value={chosen(line)}
                onValueChange={(p: Product | null) => pickProduct(line.key, p)}
                // Selected state shows the name alone; the price is already in
                // its own column by then.
                itemToStringLabel={(p: Product) => p.name}
                // The default filter only matches itemToStringLabel — name
                // alone — so a typed SKU found nothing even though it's
                // right there on every row.
                filter={(p: Product, query: string) => {
                  const q = query.trim().toLowerCase();
                  if (q === "") return true;
                  return (
                    p.name.toLowerCase().includes(q) ||
                    p.sku.toLowerCase().includes(q)
                  );
                }}
              >
                <ComboboxInput
                  id={`${fieldId}-line-${index}-product`}
                  aria-label="Product"
                  // Short enough not to be clipped in the narrow mobile column.
                  placeholder="Search"
                />
                {/* The popup defaults to the width of the field it hangs off,
                    and on a phone that field is a ~150px column — product names
                    came out as "Suns…". Widened to the screen there; from `sm`
                    the column is roomy enough to go back to matching it. */}
                <ComboboxContent className="w-[min(22rem,calc(100vw-2.5rem))] sm:w-(--anchor-width)">
                  <ComboboxEmpty>
                    No product matches. Add it on the Products page first.
                  </ComboboxEmpty>
                  <ComboboxList>
                    {/* Name, with stock pushed to the far edge so the counts
                      line up down the list instead of drifting with the name
                      lengths. The price isn't listed — picking the product
                      fills it into the Unit price field, which is where it can
                      actually be read and changed.

                      A sold-out product can still be picked, so the reason the
                      order won't save is stated on the line rather than hidden
                      behind an item that refuses to click. */}
                    {products.map((p) => (
                      <ComboboxItem key={p.id} value={p} className="pr-8">
                        <span className="flex min-w-0 flex-1 items-baseline gap-3">
                          <span className="truncate">{p.name}</span>
                          <span className="numeric shrink-0 font-mono text-[11px] text-muted-foreground">
                            {p.sku}
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
                <p className="col-span-full px-1 text-[11px] text-destructive">
                  {short.stock === 0
                    ? "Out of stock"
                    : `Only ${short.stock} in stock`}
                  , ordering {short.ordered}.
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
        <p className="mt-2 text-[11px] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
