"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, Search01Icon } from "@hugeicons/core-free-icons";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

const DEBOUNCE_MS = 300;

export function ProductSearch({
  query,
  view,
}: {
  query: string;
  view: "contact" | "table";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    const params = new URLSearchParams(searchParams.toString());
    if (next.trim() === "") params.delete("q");
    else params.set("q", next);
    if (view === "table") params.set("view", "table");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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
      <InputGroupInput
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Product name"
        aria-label="Search products by name"
        autoCorrect="off"
        className="[&::-webkit-search-cancel-button]:appearance-none"
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
