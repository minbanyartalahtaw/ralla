"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Tick02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { formatKyat } from "@/lib/orders";
import { normalizeSku } from "@/lib/products";

import { createProductAction } from "./actions";
import { emptyCreateProductState } from "./state";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      className="mt-1 flex items-center gap-1 text-[11px] text-destructive"
    >
      <HugeiconsIcon icon={Alert02Icon} size={12} strokeWidth={2} />
      {message}
    </p>
  );
}

function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[11px] font-medium">
      {children}
    </label>
  );
}

export function ProductForm() {
  const [state, formAction, pending] = useActionState(
    createProductAction,
    emptyCreateProductState,
  );

  const [sku, setSku] = React.useState("");
  const [price, setPrice] = React.useState("");

  const { errors } = state;

  // Show what the server will actually store, so casing changes aren't a
  // surprise after saving.
  const normalizedSku = normalizeSku(sku);
  const showNormalized = normalizedSku !== "" && normalizedSku !== sku.trim();

  const parsedPrice = Number.parseInt(price.replace(/,/g, ""), 10);
  const pricePreview =
    Number.isSafeInteger(parsedPrice) && parsedPrice > 0
      ? formatKyat(parsedPrice)
      : null;

  if (state.created) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-delivered-soft text-delivered">
          <HugeiconsIcon icon={Tick02Icon} size={18} strokeWidth={2} />
        </span>
        <p className="mt-3 text-sm font-medium">Product saved</p>
        <p className="numeric mt-1 font-mono text-xs text-muted-foreground">
          {state.created.sku} · {state.created.name}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Active products appear in the picker on a new order.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button nativeButton={false} render={<Link href="/user/product/new" />}>
            Add another
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/user/product" />}
          >
            Back to products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border-l-2 border-destructive bg-destructive/10 px-4 py-2.5 text-destructive"
        >
          <HugeiconsIcon
            icon={Alert02Icon}
            size={14}
            strokeWidth={1.5}
            className="mt-px shrink-0"
          />
          <p className="text-xs font-medium">{state.message}</p>
        </div>
      ) : null}

      <fieldset className="rounded-lg border bg-card">
        <legend className="sr-only">Product</legend>
        <div className="border-b px-5 py-3">
          <h2 className="text-[13px] font-semibold">Product</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              name="sku"
              placeholder="LIP-VM-01"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              aria-invalid={!!errors.sku}
              aria-describedby={errors.sku ? "sku-error" : undefined}
            />
            {showNormalized ? (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                saved as {normalizedSku}
              </p>
            ) : null}
            <FieldError id="sku-error" message={errors.sku} />
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Velvet Matte Lipstick"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            <FieldError id="name-error" message={errors.name} />
          </div>

          <div>
            <Label htmlFor="price">Price</Label>
            <InputGroup
              className={errors.price ? "border-destructive" : undefined}
            >
              <InputGroupInput
                id="price"
                name="price"
                inputMode="numeric"
                placeholder="18500"
                className="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-invalid={!!errors.price}
                aria-describedby={errors.price ? "price-error" : undefined}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>Ks</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {pricePreview ? (
              <p className="numeric mt-1 text-[11px] text-muted-foreground">
                {pricePreview}
              </p>
            ) : null}
            <FieldError id="price-error" message={errors.price} />
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox name="isActive" defaultChecked />
              Available to sell — shows in the picker on a new order
            </label>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Existing orders keep their line items either way; this only
              controls what can be added to a new one.
            </p>
          </div>
        </div>
      </fieldset>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/user/product" />}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save product"}
        </Button>
      </div>
    </form>
  );
}
