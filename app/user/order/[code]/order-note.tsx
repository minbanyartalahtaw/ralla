"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { updateOrderNoteAction } from "../actions";

/**
 * The order's free-text note, editable in place. Unlike the status history
 * this is a single field, not a log — saving overwrites whatever was there.
 */
export function OrderNote({
  orderId,
  code,
  note,
}: {
  orderId: number;
  code: string;
  note: string;
}) {
  const [value, setValue] = React.useState(note);
  const [pending, startTransition] = React.useTransition();
  const dirty = value !== note;

  function save() {
    const data = new FormData();
    data.set("id", String(orderId));
    data.set("code", code);
    data.set("note", value);
    startTransition(async () => {
      try {
        await updateOrderNoteAction(data);
        toast.success("Note saved.");
      } catch {
        toast.error("Couldn't save the note. Try again.");
      }
    });
  }

  return (
    <div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nothing noted yet."
        className="text-xs"
      />
      <div className="mt-2 flex justify-end">
        <Button
          type="button"
          variant="outline"
          className="h-7"
          disabled={!dirty || pending}
          onClick={save}
        >
          {pending ? "Saving…" : "Save note"}
        </Button>
      </div>
    </div>
  );
}
