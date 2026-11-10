"use client";

import * as React from "react";
import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  ArrowRight02Icon,
  LockPasswordIcon,
  UserIcon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

import { signInAction } from "./actions";
import { emptyLoginState } from "./state";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    emptyLoginState,
  );
  const [reveal, setReveal] = React.useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <div
          id="login-error"
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-destructive"
        >
          <HugeiconsIcon
            icon={Alert02Icon}
            size={15}
            strokeWidth={2}
            className="mt-px shrink-0"
          />
          <p className="text-[13px] leading-relaxed font-medium">{state.error}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="mb-1.5 block text-[13px] font-medium"
          >
            Username
          </label>
          <InputGroup className="h-11 rounded-xl bg-card dark:bg-input/30 [&_input]:text-sm">
            <InputGroupAddon className="pl-3.5">
              <HugeiconsIcon icon={UserIcon} strokeWidth={1.6} />
            </InputGroupAddon>
            <InputGroupInput
              id="username"
              name="username"
              placeholder="Enter your username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              autoFocus
              aria-invalid={!!state.error}
              aria-describedby={state.error ? "login-error" : undefined}
            />
          </InputGroup>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[13px] font-medium"
          >
            Password
          </label>
          <InputGroup className="h-11 rounded-xl bg-card dark:bg-input/30 [&_input]:text-sm">
            <InputGroupAddon className="pl-3.5">
              <HugeiconsIcon icon={LockPasswordIcon} strokeWidth={1.6} />
            </InputGroupAddon>
            <InputGroupInput
              id="password"
              name="password"
              type={reveal ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-invalid={!!state.error}
              aria-describedby={state.error ? "login-error" : undefined}
            />
            <InputGroupAddon align="inline-end" className="pr-3">
              <InputGroupButton
                size="icon-sm"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? "Hide password" : "Show password"}
              >
                <HugeiconsIcon
                  icon={reveal ? ViewOffIcon : ViewIcon}
                  strokeWidth={1.5}
                />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="group h-11 w-full rounded-xl text-sm font-semibold"
        disabled={pending}
      >
        {pending ? "Signing in…" : "Sign in"}
        <HugeiconsIcon
          icon={ArrowRight02Icon}
          strokeWidth={2}
          className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      </Button>
    </form>
  );
}
