"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Role } from "@/lib/permissions";

import { FieldError, Label } from "../settings/field";
import {
  createStaffAction,
  resetStaffPasswordAction,
  setStaffActiveAction,
  setStaffRoleAction,
} from "./actions";
import { emptyStaffFormState, type StaffFormState } from "./state";

/** Success and refusals both come back as a toast; the list re-renders itself. */
function useToast(state: StaffFormState, onOk?: () => void) {
  const onOkRef = useRef(onOk);
  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      onOkRef.current?.();
    } else if (state.message) toast.error(state.message);
  }, [state]);
}

const ADD_FIELDS = [
  { name: "name", label: "Name", type: "text", autoComplete: "off" },
  { name: "username", label: "Username", type: "text", autoComplete: "off" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
] as const;

export function AddStaffForm() {
  const [state, action, pending] = useActionState(createStaffAction, emptyStaffFormState);
  const formRef = useRef<HTMLFormElement>(null);
  useToast(state, () => formRef.current?.reset());

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {ADD_FIELDS.map((field) => {
          const error = state.errors[field.name];
          return (
            <div key={field.name}>
              <Label htmlFor={`new-${field.name}`}>{field.label}</Label>
              <Input
                id={`new-${field.name}`}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                autoCapitalize="none"
                aria-invalid={!!error}
                aria-describedby={error ? `new-${field.name}-error` : undefined}
              />
              <FieldError id={`new-${field.name}-error`} message={error} />
            </div>
          );
        })}
      </div>
      <fieldset className="flex items-center gap-4 text-xs">
        <legend className="sr-only">Role</legend>
        {(["staff", "admin"] as const).map((role) => (
          <label key={role} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="role"
              value={role}
              defaultChecked={role === "staff"}
              className="size-3.5 accent-[var(--primary)]"
            />
            {role === "admin" ? "Admin" : "Staff"}
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add account"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Reset password, change role, turn off/on — for one account. Hidden for your
 * own row (the server refuses those anyway); use Settings for yourself.
 */
export function StaffRowActions({
  id,
  name,
  role,
  active,
}: {
  id: number;
  name: string;
  role: Role;
  active: boolean;
}) {
  const [pwState, pwAction, pwPending] = useActionState(
    resetStaffPasswordAction,
    emptyStaffFormState,
  );
  const [roleState, roleAction, rolePending] = useActionState(
    setStaffRoleAction,
    emptyStaffFormState,
  );
  const [activeState, activeAction, activePending] = useActionState(
    setStaffActiveAction,
    emptyStaffFormState,
  );
  const pwRef = useRef<HTMLFormElement>(null);
  useToast(pwState, () => pwRef.current?.reset());
  useToast(roleState);
  useToast(activeState);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <form ref={pwRef} action={pwAction} className="flex items-center gap-1">
        <input type="hidden" name="id" value={id} />
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="New password"
          aria-label={`New password for ${name}`}
          className="w-32"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={pwPending}>
          Reset password
        </Button>
      </form>
      <form action={roleAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="role" value={role === "admin" ? "staff" : "admin"} />
        <Button type="submit" size="sm" variant="outline" disabled={rolePending}>
          {role === "admin" ? "Make staff" : "Make admin"}
        </Button>
      </form>
      <form action={activeAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="active" value={String(!active)} />
        {active ? (
          <Button type="submit" size="sm" variant="destructive" disabled={activePending}>
            <HugeiconsIcon icon={Alert02Icon} data-icon="inline-start" />
            Turn off
          </Button>
        ) : (
          <Button type="submit" size="sm" variant="secondary" disabled={activePending}>
            Turn on
          </Button>
        )}
      </form>
    </div>
  );
}
