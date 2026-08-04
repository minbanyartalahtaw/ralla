"use client";

import * as React from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, PlusSignIcon, Search01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const STATUS_OPTIONS = [
  "All statuses",
  "Pending",
  "Packing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

/**
 * Filter bar for the orders table. Client-side because the Combobox and
 * Calendar hold selection state — the table itself stays a Server Component.
 */
export function OrdersToolbar() {
  const [status, setStatus] = React.useState<string | null>(STATUS_OPTIONS[0]);
  const [range, setRange] = React.useState<DateRange | undefined>();

  const rangeLabel = range?.from
    ? range.to
      ? `${format(range.from, "dd MMM")} – ${format(range.to, "dd MMM")}`
      : format(range.from, "dd MMM")
    : "Any date";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b p-3">
      <InputGroup className="w-full sm:w-64">
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} strokeWidth={1.5} />
        </InputGroupAddon>
        <InputGroupInput placeholder="Search order ID or customer" />
      </InputGroup>

      <Combobox items={STATUS_OPTIONS} value={status} onValueChange={setStatus}>
        <ComboboxInput className="w-full sm:w-44" placeholder="Filter status" />
        <ComboboxContent>
          <ComboboxEmpty>No status found.</ComboboxEmpty>
          <ComboboxList>
            {STATUS_OPTIONS.map((option) => (
              <ComboboxItem key={option} value={option}>
                {option}
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline">
              <HugeiconsIcon icon={Calendar03Icon} data-icon="inline-start" />
              {rangeLabel}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0">
          <Calendar mode="range" selected={range} onSelect={setRange} />
        </PopoverContent>
      </Popover>

      <Button className="ml-auto">
        <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
        New order
      </Button>
    </div>
  );
}
