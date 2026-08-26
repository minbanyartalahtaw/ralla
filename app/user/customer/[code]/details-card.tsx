"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import type { Customer } from "@/lib/customers";
import { CITIES, formatDate } from "@/lib/orders";

import { updateCustomerAction } from "./actions";

const label =
  "text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase";

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

function FieldLabel({
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

/** Mobile stacks (label above value) for scanability; desktop keeps label left / value right. */
function Row({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className={`${label} shrink-0`}>{title}</dt>
      <dd className="text-sm leading-relaxed text-foreground sm:text-right sm:text-[13px]">{children}</dd>
    </div>
  );
}

/**
 * The customer detail page's one editable card. A pencil by the heading
 * swaps the whole `<dl>` for a form with the same fields as the create form
 * — see the comment this replaces: "every editable field in one card, in
 * one shape" was written so an Edit button had a single list to act on.
 *
 * `code`, `createdAt` and the order stats above stay out of the form: the
 * code is the permanent identity a saved link points at, and the rest isn't
 * something staff correct by hand.
 */
export function DetailsCard({ customer }: { customer: Customer }) {
  const [pending, startTransition] = React.useTransition();
  const [editing, setEditing] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [message, setMessage] = React.useState<string | undefined>();

  const [city, setCity] = React.useState<string | null>(customer.city);

  function startEdit() {
    setCity(customer.city);
    setErrors({});
    setMessage(undefined);
    setEditing(true);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateCustomerAction(data);
      if (!result.ok) {
        setErrors(result.errors);
        setMessage(result.message);
        return;
      }
      // The fresh values arrive through the `customer` prop once the
      // action's revalidatePath lands.
      setEditing(false);
      toast.success("Customer details updated.");
    });
  }

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between px-1">
        <h2 className={label}>Details</h2>
        {!editing ? (
          <Button
            variant="outline"
            size="sm"
            aria-label="Edit details"
            onClick={startEdit}
            className="h-7 gap-1.5 rounded-full px-3 text-xs"
          >
            <HugeiconsIcon icon={PencilEdit01Icon} size={13} strokeWidth={2} />
            Edit
          </Button>
        ) : null}
      </div>

      {!editing ? (
        <dl className="mt-3 divide-y divide-border/70 overflow-hidden rounded-2xl border bg-card shadow-sm">
          <Row title="Name">
            <span className="font-medium">{customer.name}</span>
          </Row>
          <Row title="Mobile">
            <span className="numeric font-medium">{customer.phone}</span>
          </Row>
          <Row title="City">{customer.city}</Row>
          <Row title="Address">
            <span className="sm:inline-block sm:max-w-[22ch] sm:text-right">{customer.address}</span>
          </Row>
          <Row title="Note">
            {customer.note ? (
              <span className="sm:inline-block sm:max-w-[22ch] sm:text-right">{customer.note}</span>
            ) : (
              <span className="text-muted-foreground/40">—</span>
            )}
          </Row>
          <Row title="Added">
            <span className="numeric text-muted-foreground">{formatDate(customer.createdAt)}</span>
          </Row>
        </dl>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-3 space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
        >
          <input type="hidden" name="id" value={customer.id} />

          {message ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border-l-2 border-destructive bg-destructive/10 px-3 py-2 text-destructive"
            >
              <HugeiconsIcon
                icon={Alert02Icon}
                size={14}
                strokeWidth={1.5}
                className="mt-px shrink-0"
              />
              <p className="text-xs font-medium">{message}</p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                id="name"
                name="name"
                defaultValue={customer.name}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              <FieldError id="name-error" message={errors.name} />
            </div>

            <div>
              <FieldLabel htmlFor="phone">Mobile number</FieldLabel>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                className="numeric"
                defaultValue={customer.phone}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
              />
              <FieldError id="phone-error" message={errors.phone} />
            </div>

            <div>
              <FieldLabel htmlFor="city">City</FieldLabel>
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

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="address">Address</FieldLabel>
              <Textarea
                id="address"
                name="address"
                defaultValue={customer.address}
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? "address-error" : undefined}
              />
              <FieldError id="address-error" message={errors.address} />
            </div>

            <div className="sm:col-span-2">
              <FieldLabel htmlFor="note" optional>
                Note
              </FieldLabel>
              <Textarea id="note" name="note" defaultValue={customer.note} />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
