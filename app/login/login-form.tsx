"use client";

import * as React from "react";
import { useActionState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  Login03Icon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <form action={formAction} className="space-y-4">
      {/* Sanitized on the server before it reaches here, and again in the
          action — this input is reachable by a direct POST. */}
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <div
          id="login-error"
          role="alert"
          className="flex items-start gap-2.5 rounded-md border-l-2 border-destructive bg-destructive/10 px-4 py-2.5 text-destructive"
        >
          <HugeiconsIcon
            icon={Alert02Icon}
            size={14}
            strokeWidth={2}
            className="mt-px shrink-0"
          />
          <p className="text-xs">{state.error}</p>
        </div>
      ) : null}

      <div>
        <label htmlFor="username" className="mb-1 block text-[11px] font-medium">
          Username
        </label>
        <Input
          id="username"
          name="username"
          // Matched case-insensitively on the server, so the browser's
          // capitalisation on a phone keyboard can't lock anyone out.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="username"
          autoFocus
          aria-invalid={!!state.error}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-[11px] font-medium">
          Password
        </label>
        <InputGroup>
          <InputGroupInput
            id="password"
            name="password"
            type={reveal ? "text" : "password"}
            // Paired with the username field's `username` above so a password
            // manager saves and offers them together.
            autoComplete="current-password"
            aria-invalid={!!state.error}
            aria-describedby={state.error ? "login-error" : undefined}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              size="icon-xs"
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

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        <HugeiconsIcon icon={Login03Icon} strokeWidth={2} />
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
