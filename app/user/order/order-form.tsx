"use client";

import * as React from "react";
import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { CustomerAvatar } from "@/components/customer-avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CITIES, PAYMENT_METHOD, PAYMENT_METHOD_KEYS } from "@/lib/orders";

import type { Customer } from "@/lib/customers";
import type { Product } from "@/lib/product-store";

import { CustomerSearch } from "./customer-search";
import {
  OrderLines,
  blankLine,
  stockShortfalls,
  type HeldStock,
  type Line,
} from "./order-lines";
import {
  emptyOrderFormState,
  type OrderFormAction,
} from "./order-form-state";

/**
 * What an existing order fills the form with. Absent on /user/order/new.
 *
 * These are the order's own snapshot, not the linked customer's record — the
 * point of editing an order is to correct where *this* parcel goes.
 */
export type OrderFormInitial = {
  customerId: number | null;
  customer: string;
  phone: string;
  city: string;
  address: string;
  payment: string;
  note: string;
  lines: { productId: number | null; unitPrice: string; quantity: string }[];
};

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
    <div className="flex items-center gap-3 border-b bg-muted/20 px-5 py-4 sm:px-6">
      <span className="numeric flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
        {step}
      </span>
      <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
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
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-foreground">
      {children}
      {optional ? (
        <span className="ml-1.5 font-normal text-muted-foreground">optional</span>
      ) : null}
    </label>
  );
}

/**
 * The order form, shared by /user/order/new and /user/order/[code]/edit.
 *
 * One component rather than two on purpose: an edit that looked different from
 * the form staff already know would be a second layout to learn for the same
 * six fields. The route supplies the action, the labels and — when editing —
 * what the order already says.
 */
export function OrderForm({
  products,
  action,
  initial,
  held,
  hidden,
  allowCustomerSearch = true,
  showStockNote = false,
  submitLabel = "Save order",
}: {
  products: Product[];
  action: OrderFormAction;
  /** Absent when creating. */
  initial?: OrderFormInitial;
  /** Units the edited order already holds; see HeldStock. */
  held?: HeldStock;
  /** Extra values the route's action needs — the edit route sends the order id. */
  hidden?: Record<string, string>;
  /**
   * Off when editing: which customer an order was placed for is settled, and
   * re-pointing it at another one would move a parcel's history onto someone
   * who never bought it. The name below stays editable — that is this order's
   * own snapshot, so correcting a spelling here doesn't touch their record.
   */
  allowCustomerSearch?: boolean;
  /**
   * On when editing. Placing an order obviously takes its units off the shelf;
   * that an *edit* moves the difference back and forth is the part staff would
   * otherwise second-guess, and go and "fix" a count that is already right.
   */
  showStockNote?: boolean;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    emptyOrderFormState,
  );

  // The Combobox holds its value in React state, so a hidden input carries it
  // into the FormData the Server Action receives.
  const [city, setCity] = React.useState<string | null>(
    initial?.city || null,
  );
  // The key sequence lives here so it survives Fast Refresh and starts from
  // the same place on the server and the client.
  const [lines, setLines] = React.useState<Line[]>(() =>
    initial && initial.lines.length > 0
      ? initial.lines.map((line, i) => ({ ...blankLine(i), ...line }))
      : [blankLine(0)],
  );
  const nextLineSeq = React.useRef(
    initial && initial.lines.length > 0 ? initial.lines.length : 1,
  );

  function addLine() {
    setLines((current) => [...current, blankLine(nextLineSeq.current++)]);
  }

  // Controlled so the customer search can fill them. Still editable afterwards —
  // what gets saved is whatever is in the fields, not the customer record, so
  // a one-off address change on this order doesn't rewrite the customer.
  const [linked, setLinked] = React.useState<Customer | null>(null);
  const [customer, setCustomer] = React.useState(initial?.customer ?? "");
  const [phone, setPhone] = React.useState(initial?.phone ?? "");
  const [address, setAddress] = React.useState(initial?.address ?? "");
  // Held separately from `linked`, which is only ever set by the search box:
  // an edited order remembers which customer it was placed for without this
  // form having to load that record just to keep the link alive.
  const [customerId, setCustomerId] = React.useState<number | null>(
    initial?.customerId ?? null,
  );

  function fillFromCustomer(c: Customer) {
    setLinked(c);
    setCustomerId(c.id);
    setCustomer(c.name);
    setPhone(c.phone);
    setCity(c.city);
    setAddress(c.address);
  }

  function clearLink() {
    setLinked(null);
    setCustomerId(null);
    setCustomer("");
    setPhone("");
    setCity(null);
    setAddress("");
  }

  const { errors } = state;
  // Stock as it was when the page loaded. The action re-checks against the live
  // counts, so this only saves a round trip — it isn't the guarantee.
  const shortfalls = stockShortfalls(lines, products, held);

  return (
    <form action={formAction} className="space-y-5">
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {/* The one place the form raises its voice: a hairline rule and the
           warning icon, no filled panel. The fields say what to fix. */}
      {state.message ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive"
        >
          <HugeiconsIcon
            icon={Alert02Icon}
            size={14}
            strokeWidth={2}
            className="shrink-0"
          />
          <p className="text-xs font-medium">{state.message}</p>
        </div>
      ) : null}

      {/* ── Customer ───────────────────────────────────────────────────── */}
      <fieldset className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <legend className="sr-only">Customer</legend>
        <SectionHeader step={1} title="Customer" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <input type="hidden" name="customerId" value={customerId ?? ""} />

          {allowCustomerSearch ? (
          <div className="sm:col-span-2">
            {/* Labelled like every other field — it was the only input on the
                form floating with nothing but a placeholder. */}
            <Label htmlFor="customerSearch">
              Find by customer
            </Label>
            <CustomerSearch onSelect={fillFromCustomer} />
            {linked ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5 text-xs">
                <CustomerAvatar customer={linked} className="size-6 text-[9px]" />
                <span className="numeric font-mono font-medium text-foreground">
                  {linked.code}
                </span>
                <span className="text-muted-foreground">{linked.name}</span>
                <button
                  type="button"
                  onClick={clearLink}
                  className="ml-auto rounded-full bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            ) : null}
          </div>
          ) : null}

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
      <fieldset className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <legend className="sr-only">Items</legend>
        <SectionHeader step={2} title="Items & payment" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
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
              held={held}
            />
            {showStockNote ? (
              // Under the total, where the lines stop being edited — it answers
              // "and what happens to stock now?", which is the question the
              // last quantity typed above leaves behind.
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Saving adjusts stock by what changed on this order — no need to
                edit it on the Products page.
              </p>
            ) : null}
          </div>

          <div className="sm:col-span-2">
            <span className="mb-2 block text-xs font-medium text-foreground">Payment</span>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {/* "Refunded" isn't something an order is placed as — it only
                  shows here when the order already carries it, so an edit to
                  the address can't silently reset what was refunded. */}
              {PAYMENT_METHOD_KEYS.filter(
                (p) => p !== "refunded" || initial?.payment === "refunded",
              ).map((p) => (
                <label
                  key={p}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl border bg-card px-3.5 py-2.5 text-sm font-medium has-[input:checked]:border-primary has-[input:checked]:bg-primary/5 has-[input:checked]:text-foreground text-muted-foreground transition-colors has-[input:checked]:ring-1 has-[input:checked]:ring-primary/20"
                >
                  <input
                    type="radio"
                    name="payment"
                    value={p}
                    defaultChecked={p === (initial?.payment ?? "cod")}
                    className="size-3.5 accent-[var(--primary)]"
                  />
                  {PAYMENT_METHOD[p]}
                </label>
              ))}
            </div>
            <FieldError id="payment-error" message={errors.payment} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="note" optional>
              Note
            </Label>
            <Textarea
              id="note"
              name="note"
              placeholder=""
              defaultValue={initial?.note ?? ""}
            />
          </div>
        </div>
      </fieldset>

      {/* Full width and under the thumb on a phone; right-aligned from `sm`.
           The way out is the back button in the page header — a Cancel beside
           Save only invited the mis-tap. */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
        {/* Says why the button is dead — the offending line is marked too, but
            that can be scrolled off screen by the time you reach the button. */}
        {shortfalls.length > 0 ? (
          <p className="text-xs font-medium text-destructive sm:mr-auto">
            Not enough stock to save this order.
          </p>
        ) : null}
        <Button
          type="submit"
          className="h-10 w-full sm:h-9 sm:w-auto shadow-sm"
          disabled={pending || shortfalls.length > 0}
        >
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
