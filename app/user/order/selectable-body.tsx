"use client";

import * as React from "react";

import { TableBody } from "@/components/ui/table";

/**
 * Marks the row you last tapped.
 *
 * The orders table is far wider than a phone and scrolls sideways, so by the
 * time you reach the Total column you have lost track of which row you were
 * reading. Hover would answer that on a desktop, but there is no hover on the
 * device this is mostly used on — the mark has to survive a tap and stay put
 * while you scroll across.
 *
 * The row is marked by setting `data-state` on the DOM node rather than by
 * re-rendering: the rows are server-rendered with their status chips and links
 * already in them, and lifting all of that into client state to change one
 * highlight would drag the whole table across the boundary. Nothing else reads
 * this attribute, so there is no state to fall out of sync — `TableRow` already
 * styles `data-[state=selected]`, which is the shadcn convention.
 */
export function SelectableBody({ children }: { children: React.ReactNode }) {
  const body = React.useRef<HTMLTableSectionElement>(null);

  function select(event: React.MouseEvent<HTMLTableSectionElement>) {
    const row = (event.target as HTMLElement).closest("tr");
    if (!row || !body.current?.contains(row)) return;

    const wasSelected = row.dataset.state === "selected";

    // One row at a time: clear the previous mark first. Tapping the marked row
    // again clears it, so the highlight is never stuck on.
    for (const marked of body.current.querySelectorAll<HTMLTableRowElement>(
      'tr[data-state="selected"]',
    )) {
      delete marked.dataset.state;
    }

    if (!wasSelected) row.dataset.state = "selected";
  }

  return (
    <TableBody ref={body} onClick={select}>
      {children}
    </TableBody>
  );
}
