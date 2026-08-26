"use client";

import * as React from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Download04Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";

/**
 * The invoice as a PNG the staff member can forward.
 *
 * Rendered in the browser from the sheet already on the page, rather than
 * drawn again on the server: the sheet *is* the invoice, and a second copy of
 * that layout somewhere else is a second copy to keep in step. `globals.css`
 * pins `[data-print-sheet]` to its light tokens at all times, so a shop working
 * in dark mode still exports a white document.
 *
 * The capture inherits whatever layout the viewport is currently matching —
 * the item table on a desktop, the stacked cards on a phone — because those
 * are viewport media queries and cloning the node doesn't re-evaluate them.
 * Both are legible invoices; making the export identical everywhere means
 * moving the sheet's `sm:` rules onto container queries.
 */

/** Enough to survive a chat app's re-compression without a file anyone waits on. */
const SCALE = 2;

async function renderSheet(): Promise<Blob> {
  const sheet = document.querySelector<HTMLElement>("[data-print-sheet]");
  if (!sheet) throw new Error("No invoice sheet on this page.");

  // Loaded on click, not on render: nobody pays for the rasteriser just by
  // opening an order.
  const { domToBlob } = await import("modern-screenshot");

  return domToBlob(sheet, {
    scale: SCALE,
    backgroundColor: "#ffffff",
    // Anything staff-only on the sheet opts out by attribute rather than by
    // being listed here, so the markup stays the single place that says what
    // the customer sees. Excluding a node excludes its children with it.
    filter: (node) =>
      !(node instanceof Element && node.hasAttribute("data-invoice-hide")),
    // The rounded corners and drop shadow are how a card sits on a page. A
    // document has neither, and against a chat bubble they read as damage.
    style: { borderRadius: "0", boxShadow: "none", border: "0" },
  });
}

function save(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  // Revoking in the same tick can cancel the download before it starts.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function DownloadInvoice({ code }: { code: string }) {
  const [pending, setPending] = React.useState(false);

  async function run() {
    setPending(true);
    try {
      const file = new File([await renderSheet()], `${code}.png`, {
        type: "image/png",
      });

      // On a phone the share sheet lands straight in Messenger or Viber, which
      // is where the invoice is actually going — saving to the gallery first
      // and hunting for it after is the long way round. Desktop has no share
      // target worth the detour, so it downloads.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        save(file);
      }
    } catch (error) {
      // Dismissing the share sheet rejects. That's a choice, not a failure.
      if ((error as Error)?.name === "AbortError") return;
      toast.error("Couldn't make the invoice image. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="secondary" disabled={pending} onClick={run}>
      <HugeiconsIcon icon={Download04Icon} data-icon="inline-start" />
      {pending ? "Preparing…" : "Save image"}
    </Button>
  );
}
