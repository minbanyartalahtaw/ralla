"use client";

import * as React from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { CustomerAvatar } from "@/components/customer-avatar";
import { Highlight } from "@/components/highlight";
import type { Customer } from "@/lib/customers";

import { searchCustomersAction } from "./actions";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 200;

/**
 * Type-ahead over saved customers, by `RLC-` code, phone, or name. Searching
 * runs on the server so the whole customer table (phone numbers, addresses)
 * never ships to the browser.
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
      itemToStringLabel={(c: Customer) => c.code}
      onInputValueChange={setQuery}
      onValueChange={(c: Customer | null) => {
        if (c) onSelect(c);
      }}
    >
      <ComboboxInput
        id="customerSearch"
        placeholder="RLC, phone, or name"
        aria-label="Find a customer by RLC, phone, or name"
        autoCorrect="off"
        spellCheck={false}
      />
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
              <CustomerAvatar customer={c} className="mt-0.5 size-6 text-[9px]" />
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate text-[11px] font-medium">
                  <Highlight text={c.name} query={trimmed} />
                </span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  <span className="numeric">
                    <Highlight text={c.code} query={trimmed} />
                  </span>
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  <span className="numeric">
                    <Highlight text={c.phone} query={trimmed} digits />
                  </span>
                </span>
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
