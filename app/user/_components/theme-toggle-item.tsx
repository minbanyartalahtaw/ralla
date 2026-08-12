"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";

import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";

/**
 * Flips `.dark` on `<html>` and remembers the choice.
 *
 * The class is already on the page by the time React runs — the inline script
 * in `app/layout.tsx` puts it there before first paint — so this component's
 * job is only to report and change it, never to apply it on mount.
 */
/** Re-read whenever anything changes the class list on `<html>`. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

export function ThemeToggleItem() {
  // The class on <html> is the state — there is no copy of it in React to drift
  // out of sync. useSyncExternalStore subscribes to that DOM state directly;
  // the server snapshot is `false` because the server renders the same HTML for
  // both themes and cannot know which way the inline script went. React swaps
  // in the real value right after hydration, so nothing mismatches.
  const dark = React.useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  function apply(next: boolean) {
    document.documentElement.classList.toggle("dark", next);
    // Writing either value — not just "dark" — is what pins the choice. Once
    // this is set the OS preference is no longer consulted, so someone who
    // wants light while their laptop is dark keeps it.
    try {
      localStorage.theme = next ? "dark" : "light";
    } catch {
      // Private browsing with storage denied. The class still flipped, so the
      // toggle works for this tab; it just won't survive a reload.
    }
  }

  return (
    <DropdownMenuCheckboxItem
      checked={dark}
      onCheckedChange={apply}
      // Changing the theme is worth seeing happen — keep the menu open so the
      // colours change under it and it can be flipped straight back.
      closeOnClick={false}
    >
      <HugeiconsIcon icon={dark ? Moon02Icon : Sun03Icon} strokeWidth={1.5} />
      Dark mode
    </DropdownMenuCheckboxItem>
  );
}
