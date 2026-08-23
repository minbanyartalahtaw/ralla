import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { ProductEditSheet } from "./product-edit-sheet";
import type { Product } from "@/lib/products";
import { PRODUCT_ACTIVITY, productActivity } from "@/lib/products";

function groupKey(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase();
  if (!ch) return "#";
  return /^[A-Z]$/.test(ch) ? ch : "#";
}

function sortByName(a: Product, b: Product): number {
  return a.name.localeCompare(b.name);
}

export function ProductContacts({ products }: { products: Product[] }) {
  const sorted = [...products].sort(sortByName);

  const groups = new Map<string, Product[]>();
  for (const p of sorted) {
    const k = groupKey(p.name);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(p);
  }

  const letters = [...groups.keys()].sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  if (letters.length === 0) return null;

  return (
    // The A/B/C letter headings are off for now — the grouping itself stays, so
    // the list is still ordered by them and the headings can come back.
    <div className="divide-y divide-border/40">
      {letters.map((letter) => {
        const items = groups.get(letter)!;
        return (
          <section key={letter}>
            <ul className="divide-y divide-border/40">
              {items.map((p) => {
                const activity = PRODUCT_ACTIVITY[productActivity(p.isActive)];

                return (
                  <ProductEditSheet
                    key={p.id}
                    product={p}
                    className={`flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-4 ${p.isActive ? "" : "opacity-60"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[13px] font-medium leading-tight">{p.name}</span>
                        <span className="shrink-0 font-mono text-[10px] font-medium tracking-wide text-muted-foreground">
                          {p.sku}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="numeric font-medium text-foreground">
                          {p.stock.toLocaleString()} <span className="font-normal text-muted-foreground">{p.stock === 1 ? "unit" : "units"}</span>
                        </span>
                        <span className="hidden size-1 rounded-full bg-border sm:inline-block" aria-hidden />
                        <span className="numeric font-medium text-foreground">
                          {p.price.toLocaleString()} <span className="font-normal text-muted-foreground">Ks</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-1 rounded-full bg-border" aria-hidden />
                          <span className={`size-1.5 rounded-full ${activity.dot}`} aria-hidden />
                          <span className="text-[11px] text-muted-foreground">{activity.label}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center">
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={14}
                        strokeWidth={1.8}
                        className="text-muted-foreground/40"
                        aria-hidden
                      />
                    </div>
                  </ProductEditSheet>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
