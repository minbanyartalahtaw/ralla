"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  LockPasswordIcon,
  MoreHorizontalIcon,
  UserBlock01Icon,
  UserCheck01Icon,
  UserSwitchIcon,
} from "@hugeicons/core-free-icons";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type Dialog = "password" | "role" | "active" | null;

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
  const [open, setOpen] = useState<Dialog>(null);
  const close = () => setOpen(null);
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
  useToast(pwState, close);
  useToast(roleState, close);
  useToast(activeState, close);

  const who = name || "this account";
  const nextRole = role === "admin" ? "staff" : "admin";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              aria-label={`Manage ${who}`}
              className="shrink-0"
            >
              Manage
              <HugeiconsIcon icon={MoreHorizontalIcon} data-icon="inline-end" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => setOpen("password")}>
            <HugeiconsIcon icon={LockPasswordIcon} strokeWidth={1.5} />
            Reset password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen("role")}>
            <HugeiconsIcon icon={UserSwitchIcon} strokeWidth={1.5} />
            {nextRole === "admin" ? "Make admin" : "Make staff"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {active ? (
            <DropdownMenuItem variant="destructive" onClick={() => setOpen("active")}>
              <HugeiconsIcon icon={UserBlock01Icon} strokeWidth={1.5} />
              Turn off account
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setOpen("active")}>
              <HugeiconsIcon icon={UserCheck01Icon} strokeWidth={1.5} />
              Turn on account
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={open === "password"} onOpenChange={(v) => !v && close()}>
        <AlertDialogContent>
          <form action={pwAction} className="grid gap-3">
            <AlertDialogHeader>
              <AlertDialogTitle>Reset password for {who}</AlertDialogTitle>
              <AlertDialogDescription>
                They will be signed out on every device and use the new password next time.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input type="hidden" name="id" value={id} />
            <div>
              <Label htmlFor={`pw-${id}`}>New password</Label>
              <Input
                id={`pw-${id}`}
                name="password"
                type="password"
                autoComplete="new-password"
                autoFocus
                required
                className="h-9"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button type="submit" disabled={pwPending}>
                {pwPending ? "Saving…" : "Reset password"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={open === "role"} onOpenChange={(v) => !v && close()}>
        <AlertDialogContent>
          <form action={roleAction} className="grid gap-3">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {nextRole === "admin" ? `Make ${who} an admin?` : `Make ${who} staff?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {nextRole === "admin"
                  ? "Admins can see the dashboard, edit products and customers, restore deleted orders and manage staff. After this, no admin can reset their password, turn them off or make them staff again in the app."
                  : "Staff can write and edit orders, and see products and customers. They lose admin pages."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="role" value={nextRole} />
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              <Button type="submit" disabled={rolePending}>
                {nextRole === "admin" ? "Make admin" : "Make staff"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={open === "active"} onOpenChange={(v) => !v && close()}>
        <AlertDialogContent>
          <form action={activeAction} className="grid gap-3">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {active ? `Turn off ${who}?` : `Turn on ${who}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {active
                  ? "They are signed out and can't sign in until you turn the account back on. Their orders stay."
                  : "They can sign in again with their current password."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="active" value={String(!active)} />
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
              {active ? (
                <Button
                  type="submit"
                  disabled={activePending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  <HugeiconsIcon icon={Alert02Icon} data-icon="inline-start" />
                  Turn off
                </Button>
              ) : (
                <Button type="submit" disabled={activePending}>
                  Turn on
                </Button>
              )}
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
