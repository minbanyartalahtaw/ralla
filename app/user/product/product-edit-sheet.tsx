"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isValidSku, normalizeSku, parsePrice, parseStock } from "@/lib/products";
import type { Product } from "@/lib/products";

import {
  setProductNameAction,
  setProductPriceAction,
  setProductSkuAction,
  setProductStockAction,
  toggleProductActiveAction,
} from "./actions";

export function ProductEditSheet({
  product,
  className,
  children,
}: {
  product: Product;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const [name, setName] = React.useState(product.name);
  const [sku, setSku] = React.useState(product.sku);
  const [stock, setStock] = React.useState(String(product.stock));
  const [price, setPrice] = React.useState(String(product.price));
  const [isActive, setIsActive] = React.useState(product.isActive);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Load the latest server values each time the sheet opens, rather than
      // carrying over whatever was left in the fields from a cancelled edit.
      setName(product.name);
      setSku(product.sku);
      setStock(String(product.stock));
      setPrice(String(product.price));
      setIsActive(product.isActive);
    }
    setOpen(next);
  }

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Product name is required.");
      return;
    }
    const nextSku = normalizeSku(sku);
    if (!isValidSku(nextSku)) {
      toast.error("Letters, numbers and dashes only, 2–24 characters.");
      return;
    }
    const nextStock = stock.trim() === "" ? 0 : parseStock(stock);
    if (nextStock === null) {
      toast.error("Stock must be whole units, 0 or more.");
      return;
    }
    const nextPrice = parsePrice(price);
    if (nextPrice === null) {
      toast.error("Price must be whole kyats, at least 1.");
      return;
    }

    startTransition(async () => {
      // Collect changes — call only what actually changed to avoid extra writes.
      const tasks: Promise<unknown>[] = [];

      if (trimmedName !== product.name) {
        const fd = new FormData();
        fd.set("id", String(product.id));
        fd.set("name", trimmedName);
        tasks.push(
          setProductNameAction(fd).then((r) => {
            if (r?.error) throw new Error(r.error);
          }),
        );
      }

      if (nextSku !== product.sku) {
        const fd = new FormData();
        fd.set("id", String(product.id));
        fd.set("sku", nextSku);
        tasks.push(
          setProductSkuAction(fd).then((r) => {
            if (r?.error) throw new Error(r.error);
          }),
        );
      }

      if (nextStock !== product.stock) {
        const fd = new FormData();
        fd.set("id", String(product.id));
        fd.set("stock", String(nextStock));
        tasks.push(setProductStockAction(fd));
      }

      if (nextPrice !== product.price) {
        const fd = new FormData();
        fd.set("id", String(product.id));
        fd.set("price", String(nextPrice));
        tasks.push(setProductPriceAction(fd));
      }

      if (isActive !== product.isActive) {
        const fd = new FormData();
        fd.set("id", String(product.id));
        fd.set("isActive", String(isActive));
        tasks.push(toggleProductActiveAction(fd));
      }

      if (tasks.length === 0) {
        setOpen(false);
        return;
      }

      try {
        await Promise.all(tasks);
        toast.success(`${nextSku || trimmedName} updated.`);
        setOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save. Try again.");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      {/* The whole row is the trigger, not just a pencil icon — the box reads
          as a contact card, so tapping anywhere on it should open the sheet.
          `nativeButton={false}` renders it as `<li>` while Base UI patches in
          the role, tabIndex and Enter/Space handling a real button would have
          for free. */}
      <SheetTrigger
        nativeButton={false}
        render={<li className={className} aria-label={`Edit ${product.name}`} />}
      >
        {children}
      </SheetTrigger>

      <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Edit product</SheetTitle>
          <SheetDescription className="font-mono text-[11px]">{product.sku}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 p-6 pt-2">
          <div>
            <label htmlFor={`edit-name-${product.id}`} className="mb-1 block text-[11px] font-medium">
              Name
            </label>
            <Input
              id={`edit-name-${product.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
            />
          </div>

          <div>
            <label htmlFor={`edit-sku-${product.id}`} className="mb-1 block text-[11px] font-medium">
              SKU
            </label>
            <Input
              id={`edit-sku-${product.id}`}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
            />
            {normalizeSku(sku) !== sku.trim() && normalizeSku(sku) ? (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                saved as {normalizeSku(sku)}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`edit-stock-${product.id}`} className="mb-1 block text-[11px] font-medium">
                Stock
              </label>
              <Input
                id={`edit-stock-${product.id}`}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                inputMode="numeric"
                className="numeric"
                placeholder="0"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">units</p>
            </div>
            <div>
              <label htmlFor={`edit-price-${product.id}`} className="mb-1 block text-[11px] font-medium">
                Price
              </label>
              <Input
                id={`edit-price-${product.id}`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="numeric"
                className="numeric"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Ks</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-3.5 rounded border-input accent-primary"
            />
            <span className={isActive ? "font-medium" : "text-muted-foreground"}>
              {isActive ? "Active — shown in order picker" : "Deactivated — hidden"}
            </span>
          </label>

          <div className="mt-auto flex items-center justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
