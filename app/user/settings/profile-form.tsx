"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { updateNameAction } from "./actions";
import { FieldError, Label } from "./field";
import { emptySettingsFormState } from "./state";

export function ProfileForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(
    updateNameAction,
    emptySettingsFormState,
  );

  useEffect(() => {
    if (state.ok) toast.success("Name updated.");
  }, [state]);

  const error = state.errors.name;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        {/* Keyed on the saved name: a successful save re-renders the page with
            the new value, and Base UI warns if an uncontrolled field's default
            changes after mount. A fresh input takes the new default cleanly. */}
        <Input
          key={name}
          id="name"
          name="name"
          defaultValue={name}
          autoComplete="name"
          aria-invalid={!!error}
          aria-describedby={error ? "name-error" : undefined}
        />
        <FieldError id="name-error" message={error} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save name"}
        </Button>
      </div>
    </form>
  );
}
