"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CustomerAvatar } from "@/components/customer-avatar";
import {
  AVATAR_TIERS,
  AVATAR_TIER_KEYS,
  avatarDataUri,
  avatarIdsForTier,
  avatarTier,
  type AvatarTier,
} from "@/lib/avatar";
import type { Customer } from "@/lib/customers";

import { updateCustomerAvatarAction } from "./actions";

/**
 * The detail header's avatar, with a pencil badge that opens the catalogue.
 *
 * Tabs are the four tiers, so choosing a picture and saying what kind of
 * customer this is are the same action — the tier is what the picture is for.
 * Saves the moment one is clicked, like StatusSelect, rather than through a
 * separate Save step.
 */
export function AvatarPicker({ customer }: { customer: Customer }) {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  // `undefined` means "no pending change" — distinct from `null`, which is a
  // pending change *to* no avatar.
  const [optimistic, setOptimistic] = React.useState<string | null | undefined>(
    undefined,
  );

  const avatar = optimistic !== undefined ? optimistic : customer.avatar;
  const currentTier = avatarTier(avatar);
  const [tab, setTab] = React.useState<AvatarTier>(currentTier ?? "normal");

  function choose(id: string | null) {
    setOpen(false);
    if (id === customer.avatar) return;

    setOptimistic(id);
    startTransition(async () => {
      const result = await updateCustomerAvatarAction(customer.id, id);
      if (!result.ok) {
        toast.error(result.message ?? "Couldn't update the avatar.");
        setOptimistic(undefined);
        return;
      }
      const tier = avatarTier(id);
      toast.success(
        tier ? `Avatar set — ${AVATAR_TIERS[tier].label}.` : "Avatar cleared.",
      );
    });
  }

  const ids = avatarIdsForTier(tab);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reopening should land on the tier they're already in, not wherever
        // they browsed to last time.
        if (next) setTab(currentTier ?? "normal");
      }}
    >
      <PopoverTrigger
        render={
          <button
            type="button"
            disabled={pending}
            aria-label="Change avatar"
            className="group/avatar relative shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-60"
          />
        }
      >
        <CustomerAvatar
          customer={{ name: customer.name, avatar }}
          className="size-12 text-sm"
        />
        <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-card text-muted-foreground ring-2 ring-card transition-colors group-hover/avatar:text-foreground">
          <HugeiconsIcon icon={PencilEdit01Icon} size={11} strokeWidth={2} />
        </span>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 gap-3">
        <div role="tablist" aria-label="Customer type" className="flex gap-0.5">
          {AVATAR_TIER_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-md px-1.5 py-1 text-[11px] font-medium transition-colors ${
                tab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {AVATAR_TIERS[key].label}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground">
          {AVATAR_TIERS[tab].description}
        </p>

        <div role="tabpanel" className="grid grid-cols-4 gap-2">
          {ids.map((id) => {
            const src = avatarDataUri(id);
            const selected = id === avatar;
            return (
              <button
                key={id}
                type="button"
                onClick={() => choose(id)}
                aria-label={`Use this ${AVATAR_TIERS[tab].label} avatar`}
                aria-pressed={selected}
                className={`aspect-square rounded-full outline-none ring-offset-2 ring-offset-popover focus-visible:ring-2 focus-visible:ring-ring/30 ${
                  selected ? "ring-2 ring-primary" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI, not a remote image next/image can optimize. */}
                <img
                  src={src ?? ""}
                  alt=""
                  className="size-full rounded-full bg-accent transition-transform hover:scale-105"
                />
              </button>
            );
          })}
        </div>

        {customer.avatar ? (
          <button
            type="button"
            onClick={() => choose(null)}
            className="text-left text-[11px] font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Use initials instead
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
