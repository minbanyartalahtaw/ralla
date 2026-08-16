"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, TiktokIcon } from "@hugeicons/core-free-icons";

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
import { CITIES, PAYMENT_METHOD, PAYMENT_METHOD_KEYS } from "@/lib/orders";

import type { Customer } from "@/lib/customers";
import type { Product } from "@/lib/product-store";

import { createOrderAction } from "./actions";
import { CustomerSearch } from "./customer-search";
import {
  OrderLines,
  blankLine,
  stockShortfalls,
  type Line,
} from "./order-lines";
import { emptyCreateOrderState } from "./state";

/**
 * Field-level errors are text alone. The warning icon belongs to the one
 * summary at the top of the form — repeated on every field it stops reading as
 * a warning and starts reading as decoration.
 */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-[11px] text-destructive">
      {message}
    </p>
  );
}

/** Numbered so the form has a shape you can hold in your head. */
function SectionHeader({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b px-5 py-3">
      <span className="numeric flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
        {step}
      </span>
      <h2 className="text-[13px] font-semibold">{title}</h2>
    </div>
  );
}

function Label({
  htmlFor,
  children,
  optional,
}: {
  htmlFor: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[11px] font-medium">
      {children}
      {optional ? (
        <span className="ml-1 font-normal text-muted-foreground">optional</span>
      ) : null}
    </label>
  );
}

export function OrderForm({ products }: { products: Product[] }) {
  const [state, formAction, pending] = useActionState(
    createOrderAction,
    emptyCreateOrderState,
  );

  // The Combobox holds its value in React state, so a hidden input carries it
  // into the FormData the Server Action receives.
  const [city, setCity] = React.useState<string | null>(null);
  // The key sequence lives here so it survives Fast Refresh and starts from
  // the same place on the server and the client.
  const [lines, setLines] = React.useState<Line[]>(() => [blankLine(0)]);
  const nextLineSeq = React.useRef(1);

  function addLine() {
    setLines((current) => [...current, blankLine(nextLineSeq.current++)]);
  }

  // Controlled so the TikTok search can fill them. Still editable afterwards —
  // what gets saved is whatever is in the fields, not the customer record, so
  // a one-off address change on this order doesn't rewrite the customer.
  const [linked, setLinked] = React.useState<Customer | null>(null);
  const [customer, setCustomer] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [address, setAddress] = React.useState("");

  function fillFromCustomer(c: Customer) {
    setLinked(c);
    setCustomer(c.name);
    setPhone(c.phone);
    setCity(c.city);
    setAddress(c.address);
  }

  function clearLink() {
    setLinked(null);
    setCustomer("");
    setPhone("");
    setCity(null);
    setAddress("");
  }

  const { errors } = state;
  // Stock as it was when the page loaded. The action re-checks against the live
  // counts, so this only saves a round trip — it isn't the guarantee.
  const shortfalls = stockShortfalls(lines, products);

  return (
    <form action={formAction} className="space-y-6">
      {/* The one place the form raises its voice: a hairline rule and the
          warning icon, no filled panel. The fields say what to fix. */}
      {state.message ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-md border border-destructive/30 px-3.5 py-2.5 text-destructive"
        >
          <HugeiconsIcon
            icon={Alert02Icon}
            size={13}
            strokeWidth={2}
            className="shrink-0"
          />
          <p className="text-[11px] font-medium">{state.message}</p>
        </div>
      ) : null}

      {/* ── Customer ───────────────────────────────────────────────────── */}
      <fieldset className="rounded-lg border bg-card">
        <legend className="sr-only">Customer</legend>
        <SectionHeader step={1} title="Customer" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <input type="hidden" name="customerId" value={linked?.id ?? ""} />

          <div className="sm:col-span-2">
            {/* Labelled like every other field — it was the only input on the
                form floating with nothing but a placeholder. */}
            <Label htmlFor="customerSearch">Find a saved customer</Label>
            <CustomerSearch onSelect={fillFromCustomer} />
            {linked ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-accent px-3 py-2 text-[11px]">
                <HugeiconsIcon
                  icon={TiktokIcon}
                  size={12}
                  strokeWidth={1.5}
                  className="text-muted-foreground"
                />
                <span className="font-mono font-medium">
                  @{linked.tiktokUsername}
                </span>
                <span className="numeric font-mono text-muted-foreground">
                  {linked.id}
                </span>
                <button
                  type="button"
                  onClick={clearLink}
                  className="ml-auto font-medium text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <Label htmlFor="customer">Name</Label>
            <Input
              id="customer"
              name="customer"
              placeholder=""
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              aria-invalid={!!errors.customer}
              aria-describedby={errors.customer ? "customer-error" : undefined}
            />
            <FieldError id="customer-error" message={errors.customer} />
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder=""
              className="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            <FieldError id="phone-error" message={errors.phone} />
          </div>

          <div>
            <Label htmlFor="city">City</Label>
            <input type="hidden" name="city" value={city ?? ""} />
            <Combobox items={[...CITIES]} value={city} onValueChange={setCity}>
              <ComboboxInput
                id="city"
                placeholder="Search a city"
                aria-invalid={!!errors.city}
              />
              <ComboboxContent>
                <ComboboxEmpty>We don&apos;t deliver there yet.</ComboboxEmpty>
                <ComboboxList>
                  {CITIES.map((option) => (
                    <ComboboxItem key={option} value={option}>
                      {option}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <FieldError id="city-error" message={errors.city} />
          </div>

          <div>
            <Label htmlFor="address" >
              Address
            </Label>
            <Input
              id="address"
              name="address"
              placeholder=""
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {/* ── Items ──────────────────────────────────────────────────────── */}
      <fieldset className="rounded-lg border bg-card">
        <legend className="sr-only">Items</legend>
        <SectionHeader step={2} title="Items & payment" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {/* The lines live in React state, so hidden inputs carry them into
                the FormData the Server Action receives. Order is preserved,
                which is what lets the action read them as parallel arrays. */}
            {/* The item name isn't sent: the action reads it from the product
                so the snapshot always matches the catalog, not the browser. */}
            {lines.map((line) => (
              <React.Fragment key={line.key}>
                <input
                  type="hidden"
                  name="lineProductId"
                  value={line.productId ?? ""}
                />
                <input
                  type="hidden"
                  name="lineUnitPrice"
                  value={line.unitPrice}
                />
                <input
                  type="hidden"
                  name="lineQuantity"
                  value={line.quantity}
                />
              </React.Fragment>
            ))}
            <OrderLines
              products={products}
              lines={lines}
              onChange={setLines}
              onAdd={addLine}
              error={errors.lines}
            />
          </div>

          <div className="sm:col-span-2">
            <span className="mb-1 block text-[11px] font-medium">Payment</span>
            <div className="flex flex-wrap gap-4">
              {PAYMENT_METHOD_KEYS.filter((p) => p !== "refunded").map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <input
                    type="radio"
                    name="payment"
                    value={p}
                    defaultChecked={p === "cod"}
                    className="size-3.5 accent-[var(--primary)]"
                  />
                  {PAYMENT_METHOD[p]}
                </label>
              ))}
            </div>
            <FieldError id="payment-error" message={errors.payment} />
          </div>

        </div>
      </fieldset>

      {/* Reversed on a phone so Save sits above Cancel and under the thumb;
          from `sm` it goes back to the usual right-aligned pair. */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
        {/* Says why the button is dead — the offending line is marked too, but
            that can be scrolled off screen by the time you reach the button. */}
        {shortfalls.length > 0 ? (
          <p className="text-[11px] text-destructive sm:mr-auto">
            Not enough stock to save this order.
          </p>
        ) : null}
        <Button
          variant="ghost"
          nativeButton={false}
          className="h-9 w-full sm:h-7 sm:w-auto"
          render={<Link href="/user/order" />}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="h-9 w-full sm:h-7 sm:w-auto"
          disabled={pending || shortfalls.length > 0}
        >
          {pending ? "Saving…" : "Save order"}
        </Button>
      </div>
    </form>
  );
}
