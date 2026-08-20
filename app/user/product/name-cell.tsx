"use client";

import * as React from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";

import { setProductNameAction } from "./actions";

/**
 * Product name, editable in place — same save-on-blur/Enter, Escape-reverts
 * behavior as StockCell and PriceCell. Only trimmed, never reformatted: a
 * product name is free text, so inner spacing and casing are the staff's own
 * choice, unlike a SKU.
 */
export function NameCell({ productId, name }: { productId: number; name: string }) {
  const [pending, startTransition] = React.useTransition();
  const [draft, setDraft] = React.useState(name);
  const [invalid, setInvalid] = React.useState(false);

  // Adopt the server value whenever it changes underneath us — a revalidate
  // after someone else's edit, or after our own save lands.
  const [lastName, setLastName] = React.useState(name);
  if (name !== lastName) {
    setLastName(name);
    setDraft(name);
    setInvalid(false);
  }

  function commit() {
    const next = draft.trim();
    if (next === "") {
      // Keep the typed text rather than silently reverting: the field stays
      // marked unsaved, so an accidental clear is visible instead of vanishing.
      setInvalid(true);
      return;
    }

    setInvalid(false);
    setDraft(next);
    if (next === name) return;

    startTransition(async () => {
      const data = new FormData();
      data.set("id", String(productId));
      data.set("name", next);
      const result = await setProductNameAction(data);
      if (result.error) {
        toast.error(result.error);
        setInvalid(true);
        return;
      }
      toast.success(`Name updated to ${next}.`);
    });
  }

  function reset() {
    setDraft(name);
    setInvalid(false);
  }

  return (
    <Input
      aria-label="Product name"
      aria-invalid={invalid || undefined}
      title={invalid ? "Not saved — name can't be blank." : undefined}
      disabled={pending}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          reset();
        }
      }}
      className="min-w-[160px] font-medium"
    />
  );
}
