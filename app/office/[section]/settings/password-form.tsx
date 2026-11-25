"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { changePasswordAction } from "./actions";
import { FieldError, Label } from "./field";
import { emptySettingsFormState } from "./state";

const FIELDS = [
  { name: "current", label: "Current password", autoComplete: "current-password" },
  { name: "next", label: "New password", autoComplete: "new-password" },
  { name: "confirm", label: "Confirm new password", autoComplete: "new-password" },
] as const;

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    emptySettingsFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    toast.success("Password changed. Other devices are signed out.");
    formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {FIELDS.map((field) => {
        const error = state.errors[field.name];
        return (
          <div key={field.name}>
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              name={field.name}
              type="password"
              autoComplete={field.autoComplete}
              aria-invalid={!!error}
              aria-describedby={error ? `${field.name}-error` : undefined}
            />
            <FieldError id={`${field.name}-error`} message={error} />
          </div>
        );
      })}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
