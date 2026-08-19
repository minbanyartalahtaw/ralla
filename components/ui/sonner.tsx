"use client"

import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { CheckmarkCircle02Icon, InformationCircleIcon, Alert02Icon, MultiplicationSignCircleIcon, Loading03Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

// Dark mode here is a `.dark` class on <html> set by an inline script before
// first paint, not next-themes — see theme-toggle-item.tsx for the same
// useSyncExternalStore pattern this mirrors.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
  return () => observer.disconnect()
}

// One chip shape, recolored per type — the same soft-pill-with-dot language
// the delivery-status chips use (see DELIVERY_STATUS in lib/orders.ts), so a
// toast reads as the same visual system rather than a bolted-on library
// default. Green/red/amber/purple are reused from delivery-status: they were
// already picked to read as good/attention/caution/neutral and to clear AA
// as a solid fill with white on top.
function iconChip(className: string, icon: IconSvgElement) {
  return (
    <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-white", className)}>
      <HugeiconsIcon icon={icon} strokeWidth={2.5} className="size-3.5" />
    </span>
  )
}

const Toaster = ({ ...props }: ToasterProps) => {
  const dark = React.useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  )

  return (
    <Sonner
      theme={dark ? "dark" : "light"}
      position="top-right"
      richColors
      className="toaster group"
      icons={{
        success: iconChip("bg-delivered", CheckmarkCircle02Icon),
        info: iconChip("bg-packing", InformationCircleIcon),
        warning: iconChip("bg-shipped", Alert02Icon),
        error: iconChip("bg-pending", MultiplicationSignCircleIcon),
        loading: (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.5} className="size-3.5 animate-spin" />
          </span>
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          // Rounder than the app's usual --radius — a toast is a transient
          // card, not chrome, so it can afford to look softer than a button.
          "--border-radius": "var(--radius-xl)",
          "--success-bg": "var(--delivered-soft)",
          "--success-border": "var(--delivered)",
          "--success-text": "var(--delivered)",
          "--warning-bg": "var(--shipped-soft)",
          "--warning-border": "var(--shipped)",
          "--warning-text": "var(--shipped)",
          "--error-bg": "var(--pending-soft)",
          "--error-border": "var(--pending)",
          "--error-text": "var(--pending)",
          "--info-bg": "var(--packing-soft)",
          "--info-border": "var(--packing)",
          "--info-text": "var(--packing)",
        } as React.CSSProperties
      }
      toastOptions={{
        unstyled: false,
        classNames: {
          // Sonner sets border-color on all four sides from --<type>-border;
          // widening only the left edge turns that into an accent bar for
          // free, already colored per type with no extra CSS.
          toast: "cn-toast items-center! gap-3! border-l-4! py-3.5! shadow-lg!",
          title: "font-semibold!",
          description: "opacity-80",
          icon: "mx-0! my-0!",
          closeButton: "rounded-full!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
