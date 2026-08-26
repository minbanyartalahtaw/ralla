"use client";

import * as React from "react";
import Link from "next/link";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CITIES } from "@/lib/orders";

import { createCustomerAction } from "./actions";
import { emptyCreateCustomerState } from "./state";

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

export function CustomerForm() {
  const [state, formAction, pending] = useActionState(
    createCustomerAction,
    emptyCreateCustomerState,
  );

  // The Combobox holds its value in React state, so a hidden input carries it
  // into the FormData the Server Action receives.
  const [city, setCity] = React.useState<string | null>(null);

  const { errors } = state;

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
        <legend className="sr-only">Delivery</legend>
        <div className="border-b px-5 py-3">
          <h2 className="text-[13px] font-semibold">Delivery Info</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder=""
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            <FieldError id="name-error" message={errors.name} />
          </div>
          <div>
            <Label htmlFor="phone">Mobile number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder=""
              className="numeric"
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

          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              placeholder=""
              aria-invalid={!!errors.address}
              aria-describedby={errors.address ? "address-error" : undefined}
            />
            <FieldError id="address-error" message={errors.address} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="note" optional>
              Note
            </Label>
            <Textarea
              id="note"
              name="note"
              placeholder=""
            />
          </div>
        </div>
      </fieldset>





      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<Link href="/user/customer" />}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save customer"}
        </Button>
      </div>
    </form>
  );
}
