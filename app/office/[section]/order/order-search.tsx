"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import type { DeliveryStatus } from "@/lib/orders";

import { ordersHref } from "./orders-href";

const DEBOUNCE_MS = 300;

export function OrderSearch({
  query,
  status,
  view,
}: {
  query: string;
  status?: DeliveryStatus;
  view: "card" | "table";
}) {
  const router = useRouter();

  const [value, setValue] = React.useState(query);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    // Only resync from the URL when the field isn't being typed into — a live
    // push updates `query` while the field has focus, and resetting here would
    // drop the caret / interrupt typing.
    if (inputRef.current !== document.activeElement) {
      setValue(query);
    }
  }, [query]);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function push(next: string) {
    // The status tab and the layout survive; `page` deliberately doesn't.
    // ordersHref() omits it, which is how a caller says "back to the first
    // page" — page 4 of the old query has nothing to do with the new one.
    router.replace(ordersHref({ query: next.trim(), status, view }), {
      scroll: false,
    });
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), DEBOUNCE_MS);
  }

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    setValue("");
    push("");
    inputRef.current?.focus();
  }

  const searching = value.trim() !== "";

  return (
    <InputGroup className="max-w-xs">
      <InputGroupAddon>
        {/* Every code starts `RL-`, so typing it is four keystrokes that never
            narrow anything. Shown, not typed — and normalizeOrderQuery()
            strips it back off a pasted code. */}
        <InputGroupText className="numeric font-mono">RL-</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=""
        aria-label="Search orders by order ID, without the RL- prefix"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        // The browser's own clear button only empties the field — it never
        // pushed, so the list stayed filtered against a box that looked empty.
        // Hidden in favour of the button below, which actually clears.
        className="numeric font-mono [&::-webkit-search-cancel-button]:appearance-none"
      />
      <InputGroupAddon align="inline-end">
        {searching ? (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            onClick={clear}
            aria-label="Clear search"
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          </InputGroupButton>
        ) : (
          <span className="inline-flex size-7 items-center justify-center text-muted-foreground/60">
            <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
          </span>
        )}
      </InputGroupAddon>
    </InputGroup>
  );
}
