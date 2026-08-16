"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Fires a success toast once, right after a create Server Action redirects
 * back to a list with `?created=<code>` in the URL.
 *
 * Reads `code` from a prop rather than `useSearchParams()` so the list page
 * (a Server Component) can hand it over straight from its already-awaited
 * `searchParams`, with no client-only hook and no Suspense boundary to add.
 *
 * The redirect never carries other query params alongside `created`, so
 * clearing it by replacing with the bare pathname is safe — there is nothing
 * else to preserve.
 */
export function CreatedToast({
  code,
  message,
  detailHref,
}: {
  code?: string;
  message: string;
  detailHref?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // Strict Mode fires this effect twice on mount in dev, and the router
  // replace below hasn't landed yet the second time — so the same `code`
  // could toast twice without this guard.
  const shown = React.useRef<string | undefined>(undefined);

  React.useEffect(() => {
    if (!code || shown.current === code) return;
    shown.current = code;

    toast.success(message, {
      action: detailHref
        ? { label: "View details", onClick: () => router.push(detailHref) }
        : undefined,
    });

    router.replace(pathname, { scroll: false });
    // Firing again on `message`/`detailHref` would re-toast on every render
    // that happens to recompute them with the same `code` still in the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return null;
}
