"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { TiktokIcon } from "@hugeicons/core-free-icons";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon, InputGroupText } from "@/components/ui/input-group";
import type { Customer } from "@/lib/customers";

import { searchCustomersAction } from "./actions";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

/**
 * Type-ahead over saved customers, by `RLC-` code only. Searching runs on the
 * server so the whole customer table (phone numbers, addresses) never ships
 * to the browser.
 */
export function CustomerSearch({
  onSelect,
}: {
  onSelect: (customer: Customer) => void;
}) {
  const [query, setQuery] = React.useState("");
  // Results are stored with the query that produced them, which lets both
  // "stale" and "searching" be derived instead of tracked as extra state —
  // no setState in the effect body, so no cascading renders.
  const [result, setResult] = React.useState<{
    query: string;
    items: Customer[];
  }>({ query: "", items: [] });

  const trimmed = query.trim();
  const active = trimmed.length >= MIN_QUERY;
  const fresh = result.query === trimmed;

  const visible = active && fresh ? result.items : [];
  // True through the debounce window as well as the request itself.
  const searching = active && !fresh;

  React.useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const items = await searchCustomersAction(trimmed);
      // Guard against an earlier request resolving after a later one.
      if (!cancelled) setResult({ query: trimmed, items });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed]);

  return (
    <Combobox
      items={visible}
      // The server already filtered; don't filter the results a second time.
      filter={null}
      // The prefix is a fixed addon on the field, not something typed — the
      // input's own value is only ever the digits after it.
      itemToStringLabel={(c: Customer) => c.code.replace(/^RLC-/, "")}
      onInputValueChange={setQuery}
      onValueChange={(c: Customer | null) => {
        if (c) onSelect(c);
      }}
    >
      <ComboboxInput
        id="customerSearch"
        placeholder=""
        aria-label="Find by customer code, without the RLC- prefix"
        className="numeric font-mono"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
      >
        <InputGroupAddon>
          <InputGroupText className="numeric font-mono">RLC-</InputGroupText>
        </InputGroupAddon>
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>
          {!active
            ? `Type at least ${MIN_QUERY} characters.`
            : searching
              ? "Searching…"
              : "No saved customer matches. Fill the fields in by hand."}
        </ComboboxEmpty>
        <ComboboxList>
          {visible.map((c) => (
            <ComboboxItem key={c.id} value={c} className="items-start py-1.5">
              <HugeiconsIcon
                icon={TiktokIcon}
                strokeWidth={1.5}
                className="mt-0.5 text-muted-foreground"
              />
              <span className="grid min-w-0 gap-0.5">
                <span className="numeric truncate font-mono text-[11px] font-medium">
                  {c.code}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {c.name} · @{c.tiktokUsername} · {c.city}
                </span>
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
